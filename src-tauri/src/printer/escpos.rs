/// ESC/POS byte builder compatible avec les imprimantes thermiques Epson, Star, etc.
/// Code page PC858 (Latin-1 + €). Largeur 48 cols (80 mm) ou 32 cols (58 mm).

// ── Helpers ───────────────────────────────────────────────────

pub fn paper_cols(mm: u8) -> usize {
    if mm >= 80 { 48 } else { 32 }
}

/// UTF-8 → PC858 (Latin-1 range passthrough, € → 0xD5)
fn to_pc858(s: &str) -> Vec<u8> {
    s.chars()
        .map(|c| match c {
            '€' => 0xD5u8,
            c if (c as u32) < 256 => c as u8,
            _ => b'?',
        })
        .collect()
}

/// Centimes → "1 234,56"
pub fn fmt_cents(cents: i64) -> String {
    let neg = cents < 0;
    let abs = cents.unsigned_abs();
    let euros = abs / 100;
    let frac  = abs % 100;
    let s = format!("{},{:02}", euros, frac);
    if neg { format!("-{}", s) } else { s }
}

/// Taux en centièmes de % → "20,00 %"
pub fn fmt_rate(pct: i64) -> String {
    format!("{},{:02} %", pct / 100, pct % 100)
}

// ── Builder ───────────────────────────────────────────────────

pub struct EscPos {
    buf:  Vec<u8>,
    cols: usize,
}

impl EscPos {
    pub fn new(paper_mm: u8) -> Self {
        let mut e = Self { buf: Vec::new(), cols: paper_cols(paper_mm) };
        e.raw(&[0x1B, 0x40]);       // ESC @ — init
        e.raw(&[0x1B, 0x74, 0x13]); // ESC t 19 — code page PC858
        e
    }

    fn raw(&mut self, b: &[u8]) { self.buf.extend_from_slice(b); }

    pub fn lf(&mut self)  { self.raw(&[0x0A]); }

    pub fn align_left(&mut self)   { self.raw(&[0x1B, 0x61, 0x00]); }
    pub fn align_center(&mut self) { self.raw(&[0x1B, 0x61, 0x01]); }
    pub fn align_right(&mut self)  { self.raw(&[0x1B, 0x61, 0x02]); }

    pub fn bold(&mut self, on: bool)   { self.raw(&[0x1B, 0x45, on as u8]); }
    pub fn double(&mut self, on: bool) { self.raw(&[0x1D, 0x21, if on { 0x11 } else { 0x00 }]); }

    pub fn text(&mut self, s: &str)    { let b = to_pc858(s); self.raw(&b); }
    pub fn println(&mut self, s: &str) { self.text(s); self.lf(); }

    pub fn sep(&mut self, ch: char) {
        let s: String = std::iter::repeat(ch).take(self.cols).collect();
        self.println(&s);
    }

    /// Print left text + right text on same line, padded to full width.
    pub fn lr(&mut self, left: &str, right: &str) {
        let lc = left.chars().count();
        let rc = right.chars().count();
        let pad = self.cols.saturating_sub(lc + rc);
        self.println(&format!("{}{}{}", left, " ".repeat(pad), right));
    }

    /// Center a string in the line width.
    pub fn centered(&mut self, s: &str) {
        let len = s.chars().count();
        let pad = self.cols.saturating_sub(len) / 2;
        self.println(&format!("{}{}", " ".repeat(pad), s));
    }

    pub fn cut(&mut self) {
        self.raw(&[0x0A, 0x0A, 0x0A, 0x0A]); // 4 line feeds
        self.raw(&[0x1D, 0x56, 0x42, 0x03]);  // GS V B 3 — partial cut
    }

    pub fn build(self) -> Vec<u8> { self.buf }
    pub fn cols(&self) -> usize   { self.cols }
}

// ── Document builders ─────────────────────────────────────────

use crate::commands::print::{ReceiptDoc, RapportDoc};

pub fn build_receipt(doc: &ReceiptDoc, paper_mm: u8) -> Vec<u8> {
    let mut p = EscPos::new(paper_mm);
    let cols  = p.cols();

    // Header
    p.align_center();
    p.bold(true);
    p.double(true);
    p.println(&doc.store_name);
    p.double(false);
    p.bold(false);
    p.lf();

    let dt = format_datetime(&doc.created_at);
    p.println(&dt);
    if let Some(ref name) = doc.cashier_name {
        p.println(&format!("Caissier : {}", name));
    }
    p.align_left();
    p.sep('-');

    // Type badge
    if doc.is_avoir {
        p.bold(true);
        p.centered("*** AVOIR ***");
        p.bold(false);
        p.sep('-');
    }

    // Lines
    let name_width = cols.saturating_sub(18); // qty(4) + price(8) + spaces(6)
    for line in &doc.lines {
        let name = truncate(&line.product_name, name_width);
        let qty  = format!("{:>2}x", line.quantity);
        let price = fmt_cents(line.line_total_ttc);
        let pad  = cols.saturating_sub(name.chars().count() + qty.len() + 2 + price.len());
        p.println(&format!("{}  {}{}{}",
            name, qty, " ".repeat(pad), price));
    }

    p.sep('-');

    // Totals
    if doc.discount_ttc > 0 {
        p.lr("Remise", &format!("-{}", fmt_cents(doc.discount_ttc)));
    }
    p.lr("Sous-total HT", &fmt_cents(doc.total_ht));
    for tg in &doc.tva_groups {
        if tg.tva > 0 {
            p.lr(&format!("TVA {}", fmt_rate(tg.rate_pct)), &fmt_cents(tg.tva));
        }
    }
    p.sep('=');

    // Total TTC — double size
    p.align_center();
    p.bold(true);
    p.double(true);
    p.println(&format!("TOTAL  {} EUR", fmt_cents(doc.total_ttc)));
    p.double(false);
    p.bold(false);
    p.align_left();
    p.sep('-');

    // Payment
    let method_label = payment_label(&doc.payment_method);
    p.lr(&method_label, &fmt_cents(doc.payment_amount));
    if let Some(change) = doc.cash_change {
        if change > 0 { p.lr("Rendu monnaie", &fmt_cents(change)); }
    }
    p.sep('-');

    // Footer
    p.align_center();
    p.println("Merci de votre visite !");
    p.lf();
    p.println(&format!("Ticket #{:0>5}", doc.sequence_no));
    p.println(&format!("{}", &doc.hash[..16]));
    p.align_left();

    p.cut();
    p.build()
}

pub fn build_rapport(doc: &RapportDoc, paper_mm: u8) -> Vec<u8> {
    let mut p = EscPos::new(paper_mm);

    // Header
    p.align_center();
    p.bold(true);
    p.double(true);
    p.println(if doc.is_z { "CLOTURE Z" } else { "RAPPORT X" });
    p.double(false);
    p.bold(false);
    p.println(&doc.store_name);
    p.lf();
    p.println(&doc.session_date);
    p.println(&doc.session_label);
    p.align_left();
    p.sep('=');

    // Key figures
    p.bold(true);
    p.println("ACTIVITE");
    p.bold(false);
    p.lr("Transactions", &doc.nb_transactions.to_string());
    p.lr("Ventes TTC",   &fmt_cents(doc.total_ventes_ttc));
    if doc.total_avoirs_ttc > 0 {
        p.lr("Avoirs TTC", &format!("-{}", fmt_cents(doc.total_avoirs_ttc)));
    }
    p.sep('-');
    p.bold(true);
    p.lr("NET TTC", &fmt_cents(doc.net_ttc));
    p.bold(false);
    p.sep('=');

    // Payments
    p.bold(true);
    p.println("PAIEMENTS");
    p.bold(false);
    if doc.pay_cb       > 0 { p.lr("Carte bancaire", &fmt_cents(doc.pay_cb)); }
    if doc.pay_especes  > 0 { p.lr("Especes",        &fmt_cents(doc.pay_especes)); }
    if doc.pay_cheque   > 0 { p.lr("Cheques",        &fmt_cents(doc.pay_cheque)); }
    if doc.pay_autre    > 0 { p.lr("Autre",          &fmt_cents(doc.pay_autre)); }
    p.sep('=');

    // TVA
    let tva_rows = [
        ("TVA 5,50%",  doc.tva_550,  doc.ht_550),
        ("TVA 10,00%", doc.tva_1000, doc.ht_1000),
        ("TVA 20,00%", doc.tva_2000, doc.ht_2000),
    ];
    let has_tva = tva_rows.iter().any(|(_, t, _)| *t > 0);
    if has_tva {
        p.bold(true);
        p.println("TVA COLLECTEE");
        p.bold(false);
        for (label, tva, ht) in &tva_rows {
            if *tva > 0 {
                p.lr(&format!("{} BASE HT", label), &fmt_cents(*ht));
                p.lr(&format!("{}  TVA",    label), &fmt_cents(*tva));
            }
        }
        p.sep('=');
    }

    // Footer
    p.align_center();
    if doc.is_z {
        p.bold(true);
        p.println("Session verrouillee NF525");
        p.bold(false);
    }
    p.println(&doc.session_label);
    p.align_left();

    p.cut();
    p.build()
}

// ── Utilities ─────────────────────────────────────────────────

fn truncate(s: &str, max: usize) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= max { s.to_string() }
    else { chars[..max.saturating_sub(1)].iter().collect::<String>() + "." }
}

fn format_datetime(iso: &str) -> String {
    // "2026-04-20T14:30:00.000Z" → "20/04/2026  14:30"
    if iso.len() >= 16 {
        let date = &iso[..10];
        let time = &iso[11..16];
        let parts: Vec<&str> = date.split('-').collect();
        if parts.len() == 3 {
            return format!("{}/{}/{}  {}", parts[2], parts[1], parts[0], time);
        }
    }
    iso.to_string()
}

fn payment_label(method: &str) -> String {
    match method {
        "CB"          => "Carte bancaire".to_string(),
        "ESPECES"     => "Especes".to_string(),
        "CHEQUE"      => "Cheque".to_string(),
        "TITRE_RESTO" => "Titre Resto".to_string(),
        "VIREMENT"    => "Virement".to_string(),
        _             => method.to_string(),
    }
}
