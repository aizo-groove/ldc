# Mentions légales et clause de non-responsabilité — LDC

> Document applicable au logiciel LDC (Logiciel de Caisse) et au site web ldc.occidev.fr.  
> Dernière mise à jour : avril 2026.

---

## 1. Éditeur

LDC est un logiciel open-source développé et maintenu à titre personnel par :

**Aizo**  
Contact : aizo@caramail.com
Profil GitHub : [github.com/aizo-groove](https://github.com/aizo-groove)

---

## 2. Hébergement du site web

Le site web est hébergé par :

**Vercel Inc.**  
340 Pine Street, Suite 701  
San Francisco, CA 94104 — États-Unis  
[vercel.com](https://vercel.com)

---

## 3. Propriété intellectuelle et licence

LDC est distribué sous licence **MIT** (voir fichier `LICENSE` à la racine du dépôt).

La licence MIT autorise toute personne à utiliser, copier, modifier, fusionner, publier, distribuer, sous-licencier et/ou vendre des copies du logiciel, sous réserve de conserver la notice de copyright et la présente permission dans toutes les copies ou parties substantielles du logiciel.

---

## 4. Clause de non-responsabilité (Limitation of Liability)

### 4.1 Fourniture du logiciel "en l'état"

LDC est fourni **"tel quel" (AS IS)**, sans garantie d'aucune sorte, expresse ou implicite. L'éditeur ne garantit pas :

- l'absence d'erreurs ou de bogues dans le logiciel ;
- l'adéquation du logiciel à un usage particulier ;
- la continuité de service ou la disponibilité de futures versions ;
- la compatibilité avec tout matériel ou système d'exploitation.

### 4.2 Responsabilité fiscale de l'utilisateur

L'utilisation de LDC ne dispense en aucun cas l'utilisateur de ses obligations fiscales et légales. **L'utilisateur (commerçant, restaurateur ou tout professionnel) reste seul responsable** :

- de la conformité de son établissement aux obligations fiscales françaises (notamment l'article 88 de la loi de finances 2016, décret NF525) ;
- de la conservation des données fiscales pendant la durée légale applicable (6 ans minimum — art. L102 B du Livre des procédures fiscales) ;
- de toute déclaration, décision ou action prise sur la base des données produites par le logiciel.

En cas de contrôle fiscal ou d'audit, il appartient à l'utilisateur de présenter les justificatifs requis. L'éditeur de LDC ne saurait être mis en cause dans ces procédures.

### 4.3 Conformité NF525 — périmètre et limites

LDC implémente les mécanismes techniques requis par le référentiel NF525 :

- chaîne de hachage SHA-256 sur les transactions ;
- journal d'audit en ajout seul (append-only) ;
- clôture Z irréversible ;
- export d'archive fiscale JSON ;
- attestation de conformité pré-remplie.

**Cette implémentation est fournie à titre indicatif.** La certification NF525 complète au sens de la norme AFNOR requiert un audit par un organisme accrédité. LDC n'a pas obtenu de certification officielle. L'éditeur ne peut être tenu responsable en cas de contestation de conformité par l'administration fiscale.

Il est fortement recommandé de consulter un expert-comptable ou un conseiller fiscal pour toute question relative aux obligations NF525 de votre établissement.

### 4.4 Limitation de responsabilité

Dans la mesure maximale permise par le droit applicable, l'éditeur ne pourra être tenu responsable de tout dommage direct, indirect, accessoire, spécial ou consécutif résultant de l'utilisation ou de l'impossibilité d'utiliser le logiciel, y compris notamment :

- pertes de données ;
- pertes financières ou de chiffre d'affaires ;
- sanctions fiscales ou pénalités administratives ;
- préjudice commercial ou d'exploitation.

Cette limitation s'applique même si l'éditeur a été informé de la possibilité de tels dommages.

> En droit français B2B, les clauses limitatives de responsabilité entre professionnels sont valides (art. 1231-3 du Code civil). En utilisant LDC dans le cadre d'une activité professionnelle, l'utilisateur reconnaît et accepte cette limitation.

---

## 5. Données personnelles (RGPD)

### 5.1 Données traitées par le logiciel

LDC fonctionne **entièrement en local** sur la machine de l'utilisateur. Aucune donnée n'est transmise à l'éditeur ou à un tiers par le biais du logiciel lui-même. Les données de transactions, de caissiers et d'établissement sont stockées exclusivement dans le fichier `ldc.db` sur le poste de l'utilisateur.

**L'utilisateur est le responsable de traitement** au sens du RGPD (Règlement (UE) 2016/679) pour toutes les données collectées et traitées via LDC. L'éditeur n'a pas accès à ces données et n'en est pas sous-traitant.

### 5.2 Données collectées via le formulaire de retour développeur

Le formulaire de retour intégré au logiciel (Paramètres → À propos → Envoyer un retour) crée une issue publique sur GitHub. Les données saisies (description du problème, version du logiciel, éventuellement des informations fournies volontairement par l'utilisateur) sont soumises à la politique de confidentialité de GitHub : [docs.github.com/fr/site-policy/privacy-policies](https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement).

### 5.3 Cookies et traceurs (site web)

Le site web ldc.occidev.fr n'utilise pas de cookies de traçage ni de scripts analytiques tiers. Le système de votes utilise le `localStorage` du navigateur, localement, sans transmission à des serveurs tiers.

---

## 6. Droit applicable et juridiction

Les présentes mentions légales sont soumises au **droit français**.

Tout litige relatif à leur interprétation ou à leur exécution relève de la compétence exclusive des tribunaux français compétents.

---

## 7. Acceptation des conditions

L'utilisation du logiciel LDC ou du site web implique l'acceptation sans réserve des présentes mentions légales et de la clause de non-responsabilité.
