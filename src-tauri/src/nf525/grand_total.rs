/// Calcul des grands totaux perpétuels (NF525 §4.3).
///
/// Les grands totaux s'accumulent depuis le premier jour d'utilisation
/// et ne sont jamais remis à zéro. Ils sont calculés à chaque clôture Z
/// en ajoutant les totaux de la session aux derniers grands totaux connus.
use crate::db::models::session::{Cloture, GrandTotal};

/// Totaux d'une session, passés par le moteur de clôture.
pub struct SessionTotals {
    pub ventes_ttc: i64,
    pub avoirs_ttc: i64,
    pub tva_2000: i64,
    pub tva_1000: i64,
    pub tva_550: i64,
    pub tva_210: i64,
    pub tva_0: i64,
}

/// Calcule les nouveaux grands totaux en additionnant les totaux de la session
/// aux derniers grands totaux connus (ou zéro si première clôture).
pub fn compute_grand_totals(
    previous: Option<&GrandTotal>,
    session: &SessionTotals,
    new_cloture_id: &str,
) -> GrandTotal {
    let prev_ventes = previous.map(|g| g.gt_ventes_ttc).unwrap_or(0);
    let prev_avoirs = previous.map(|g| g.gt_avoirs_ttc).unwrap_or(0);
    let prev_tva_2000 = previous.map(|g| g.gt_tva_2000).unwrap_or(0);
    let prev_tva_1000 = previous.map(|g| g.gt_tva_1000).unwrap_or(0);
    let prev_tva_550 = previous.map(|g| g.gt_tva_550).unwrap_or(0);
    let prev_tva_210 = previous.map(|g| g.gt_tva_210).unwrap_or(0);
    let prev_tva_0 = previous.map(|g| g.gt_tva_0).unwrap_or(0);

    let gt_ventes = prev_ventes + session.ventes_ttc;
    let gt_avoirs = prev_avoirs + session.avoirs_ttc;

    GrandTotal {
        id: uuid::Uuid::new_v4().to_string(),
        cloture_id: new_cloture_id.to_string(),
        gt_ventes_ttc: gt_ventes,
        gt_avoirs_ttc: gt_avoirs,
        gt_net_ttc: gt_ventes - gt_avoirs,
        gt_tva_2000: prev_tva_2000 + session.tva_2000,
        gt_tva_1000: prev_tva_1000 + session.tva_1000,
        gt_tva_550: prev_tva_550 + session.tva_550,
        gt_tva_210: prev_tva_210 + session.tva_210,
        gt_tva_0: prev_tva_0 + session.tva_0,
        created_at: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_gt(id: &str, ventes: i64, avoirs: i64) -> GrandTotal {
        GrandTotal {
            id: id.to_string(),
            cloture_id: "c1".to_string(),
            gt_ventes_ttc: ventes,
            gt_avoirs_ttc: avoirs,
            gt_net_ttc: ventes - avoirs,
            gt_tva_2000: 0,
            gt_tva_1000: 0,
            gt_tva_550: 0,
            gt_tva_210: 0,
            gt_tva_0: 0,
            created_at: "".to_string(),
        }
    }

    #[test]
    fn first_cloture_starts_from_zero() {
        let session = SessionTotals {
            ventes_ttc: 10000,
            avoirs_ttc: 500,
            tva_2000: 1667,
            tva_1000: 0,
            tva_550: 0,
            tva_210: 0,
            tva_0: 0,
        };
        let gt = compute_grand_totals(None, &session, "new-cloture-id");
        assert_eq!(gt.gt_ventes_ttc, 10000);
        assert_eq!(gt.gt_avoirs_ttc, 500);
        assert_eq!(gt.gt_net_ttc, 9500);
    }

    #[test]
    fn grand_totals_accumulate() {
        let prev = make_gt("g1", 10000, 500);
        let session = SessionTotals {
            ventes_ttc: 5000,
            avoirs_ttc: 0,
            tva_2000: 0,
            tva_1000: 0,
            tva_550: 0,
            tva_210: 0,
            tva_0: 0,
        };
        let gt = compute_grand_totals(Some(&prev), &session, "c2");
        assert_eq!(gt.gt_ventes_ttc, 15000);
        assert_eq!(gt.gt_avoirs_ttc, 500);
        assert_eq!(gt.gt_net_ttc, 14500);
    }
}
