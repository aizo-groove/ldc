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

/// Calcule le hash d'une clôture.
///
/// Payload canonique :
///   sequence_no | net_ttc_centimes | created_at_iso8601 | previous_hash
///
/// `previous_hash` est `"GENESIS"` pour la toute première clôture.
pub fn hash_cloture(
    sequence_no: i64,
    net_ttc: i64,
    created_at: &str,
    previous_hash: &str,
) -> String {
    let payload = format!(
        "{}|{}|{}|{}",
        sequence_no, net_ttc, created_at, previous_hash
    );
    sha256_hex(&payload)
}

/// Relit toute la chaîne de transactions depuis la DB et vérifie son intégrité.
/// Retourne `Ok(count)` si tout est valide, `Err(sequence_no)` sur le premier maillon brisé.
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
            (1i64, "VENTE".to_string(), 1000i64, "2025-01-01T10:00:00.000Z".to_string(), None, h1.clone()),
            (2i64, "VENTE".to_string(), 2000i64, "2025-01-01T10:05:00.000Z".to_string(), Some(h1.clone()), h2.clone()),
            (3i64, "AVOIR".to_string(), 500i64, "2025-01-01T10:10:00.000Z".to_string(), Some(h2.clone()), h3.clone()),
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
}
