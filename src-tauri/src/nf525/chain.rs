/// Moteur de chaîne de hachage NF525.
///
/// Chaque transaction et chaque clôture est signée par un hash SHA-256
/// qui intègre le hash du maillon précédent. Cela rend toute modification
/// rétroactive détectable par simple recalcul.
///
/// AVERTISSEMENT : Le format du payload canonique (ci-dessous) est
/// contractuel. Tout changement invalide la chaîne existante et impose
/// un bump de version logicielle (NF525 §3.4).
use sha2::{Digest, Sha256};

/// Calcule le hash d'une transaction.
///
/// Payload canonique (ordre fixe, séparateur `|`) :
///   sequence_no | type | total_ttc_centimes | created_at_iso8601 | previous_hash
///
/// `previous_hash` est la chaîne `"GENESIS"` pour la toute première transaction.
pub fn hash_transaction(
    sequence_no: i64,
    transaction_type: &str,
    total_ttc: i64,
    created_at: &str,
    previous_hash: &str,
) -> String {
    let payload = format!(
        "{}|{}|{}|{}|{}",
        sequence_no, transaction_type, total_ttc, created_at, previous_hash
    );
    sha256_hex(&payload)
}

/// Champs d'une clôture Z couverts par son hash.
#[derive(Debug, Clone)]
pub struct ClotureHashFields {
    pub sequence_no: i64,
    pub session_id: String,
    /// Dernière transaction couverte par la clôture (`None` si session vide).
    pub last_transaction_seq: Option<i64>,
    pub last_transaction_hash: Option<String>,
    pub total_ventes_ttc: i64,
    pub total_avoirs_ttc: i64,
    pub total_annulations_ttc: i64,
    pub net_ttc: i64,
    pub tva_2000: i64,
    pub tva_1000: i64,
    pub tva_550: i64,
    pub tva_210: i64,
    pub tva_0: i64,
    pub pay_especes: i64,
    pub pay_cb: i64,
    pub pay_cheque: i64,
    pub pay_autre: i64,
    pub gt_ventes_ttc: i64,
    pub gt_avoirs_ttc: i64,
    pub gt_net_ttc: i64,
    pub created_at: String,
}

/// Calcule le hash d'une clôture Z.
///
/// Payload canonique (ordre fixe, séparateur `|`) :
///   sequence_no | session_id | last_tx_seq | last_tx_hash | ventes | avoirs | annulations | net
///   | tva_2000 | tva_1000 | tva_550 | tva_210 | tva_0
///   | pay_especes | pay_cb | pay_cheque | pay_autre
///   | gt_ventes | gt_avoirs | gt_net | created_at_iso8601 | previous_hash
///
/// Les grands totaux sont inclus : les falsifier casse la chaîne des clôtures.
/// `last_tx_seq` / `last_tx_hash` valent `"NONE"` si la session est vide.
/// `previous_hash` est `"GENESIS"` pour la toute première clôture.
pub fn hash_cloture(c: &ClotureHashFields, previous_hash: &str) -> String {
    let payload = format!(
        "{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}",
        c.sequence_no,
        c.session_id,
        c.last_transaction_seq
            .map(|s| s.to_string())
            .unwrap_or_else(|| "NONE".to_string()),
        c.last_transaction_hash.as_deref().unwrap_or("NONE"),
        c.total_ventes_ttc,
        c.total_avoirs_ttc,
        c.total_annulations_ttc,
        c.net_ttc,
        c.tva_2000,
        c.tva_1000,
        c.tva_550,
        c.tva_210,
        c.tva_0,
        c.pay_especes,
        c.pay_cb,
        c.pay_cheque,
        c.pay_autre,
        c.gt_ventes_ttc,
        c.gt_avoirs_ttc,
        c.gt_net_ttc,
        c.created_at,
        previous_hash
    );
    sha256_hex(&payload)
}

/// Vérifie la chaîne des clôtures, triée par `sequence_no`.
/// Chaque élément : (champs, previous_hash stocké, hash stocké).
/// Retourne `Ok(count)` si tout est valide, `Err(sequence_no)` sur le premier maillon brisé.
pub fn verify_cloture_chain(
    clotures: &[(ClotureHashFields, Option<String>, String)],
) -> Result<usize, i64> {
    let mut expected_previous = "GENESIS".to_string();

    for (fields, previous_hash, stored_hash) in clotures {
        let prev = previous_hash.as_deref().unwrap_or("GENESIS");
        if prev != expected_previous || hash_cloture(fields, prev) != *stored_hash {
            return Err(fields.sequence_no);
        }
        expected_previous = stored_hash.clone();
    }

    Ok(clotures.len())
}

/// Relit toute la chaîne de transactions depuis la DB et vérifie son intégrité.
/// Retourne `Ok(count)` si tout est valide, `Err(sequence_no)` sur le premier maillon brisé.
#[allow(clippy::type_complexity)]
pub fn verify_chain(
    transactions: &[(i64, String, i64, String, Option<String>, String)],
    // (sequence_no, type, total_ttc, created_at, previous_hash, stored_hash)
) -> Result<usize, i64> {
    let mut expected_previous = "GENESIS".to_string();

    for (seq, tx_type, total_ttc, created_at, previous_hash, stored_hash) in transactions {
        let prev = previous_hash.as_deref().unwrap_or("GENESIS");

        if prev != expected_previous {
            return Err(*seq);
        }

        let computed = hash_transaction(*seq, tx_type, *total_ttc, created_at, prev);
        if computed != *stored_hash {
            return Err(*seq);
        }

        expected_previous = stored_hash.clone();
    }

    Ok(transactions.len())
}

fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn genesis_hash_is_deterministic() {
        let h1 = hash_transaction(1, "VENTE", 1250, "2025-01-01T10:00:00.000Z", "GENESIS");
        let h2 = hash_transaction(1, "VENTE", 1250, "2025-01-01T10:00:00.000Z", "GENESIS");
        assert_eq!(h1, h2);
    }

    #[test]
    fn chain_links_correctly() {
        let h1 = hash_transaction(1, "VENTE", 1000, "2025-01-01T10:00:00.000Z", "GENESIS");
        let h2 = hash_transaction(2, "VENTE", 2000, "2025-01-01T10:05:00.000Z", &h1);
        let h3 = hash_transaction(3, "AVOIR", 500, "2025-01-01T10:10:00.000Z", &h2);

        let chain = vec![
            (
                1i64,
                "VENTE".to_string(),
                1000i64,
                "2025-01-01T10:00:00.000Z".to_string(),
                None,
                h1.clone(),
            ),
            (
                2i64,
                "VENTE".to_string(),
                2000i64,
                "2025-01-01T10:05:00.000Z".to_string(),
                Some(h1.clone()),
                h2.clone(),
            ),
            (
                3i64,
                "AVOIR".to_string(),
                500i64,
                "2025-01-01T10:10:00.000Z".to_string(),
                Some(h2.clone()),
                h3.clone(),
            ),
        ];

        assert_eq!(verify_chain(&chain), Ok(3));
    }

    #[test]
    fn tampered_amount_breaks_chain() {
        let h1 = hash_transaction(1, "VENTE", 1000, "2025-01-01T10:00:00.000Z", "GENESIS");
        // On stocke h1 mais on falsifie total_ttc
        let chain = vec![(
            1i64,
            "VENTE".to_string(),
            9999i64, // falsifié
            "2025-01-01T10:00:00.000Z".to_string(),
            None,
            h1,
        )];
        assert_eq!(verify_chain(&chain), Err(1));
    }

    fn cloture_fields(seq: i64, net: i64, gt_net: i64) -> ClotureHashFields {
        ClotureHashFields {
            sequence_no: seq,
            session_id: format!("s{}", seq),
            last_transaction_seq: Some(seq),
            last_transaction_hash: Some(format!("h{}", seq)),
            total_ventes_ttc: net,
            total_avoirs_ttc: 0,
            total_annulations_ttc: 0,
            net_ttc: net,
            tva_2000: 0,
            tva_1000: 0,
            tva_550: 0,
            tva_210: 0,
            tva_0: 0,
            pay_especes: net,
            pay_cb: 0,
            pay_cheque: 0,
            pay_autre: 0,
            gt_ventes_ttc: gt_net,
            gt_avoirs_ttc: 0,
            gt_net_ttc: gt_net,
            created_at: "2025-01-01T20:00:00.000Z".to_string(),
        }
    }

    #[test]
    fn cloture_chain_links_and_detects_tampering() {
        let c1 = cloture_fields(1, 1000, 1000);
        let h1 = hash_cloture(&c1, "GENESIS");
        let c2 = cloture_fields(2, 500, 1500);
        let h2 = hash_cloture(&c2, &h1);

        let mut chain = vec![(c1, None, h1.clone()), (c2, Some(h1), h2)];
        assert_eq!(verify_cloture_chain(&chain), Ok(2));

        // Grand total falsifié sur la 2e clôture
        chain[1].0.gt_net_ttc = 9999;
        assert_eq!(verify_cloture_chain(&chain), Err(2));
    }
}
