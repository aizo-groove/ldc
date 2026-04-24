import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { updateSetting } from "@/lib/tauri";

export function startTour(hasTables: boolean) {
  const steps: DriveStep[] = [
    {
      popover: {
        title: "Bienvenue dans LDC !",
        description:
          "Ce guide vous présente les fonctionnalités principales en moins de 2 minutes. " +
          "Appuyez sur <strong>Suivant</strong> pour commencer, ou <strong>Terminer</strong> pour passer.",
      },
    },
    {
      element: "#tutorial-sidenav",
      popover: {
        title: "Navigation principale",
        description:
          "Ce menu vous permet de passer d'une section à l'autre. " +
          "Cliquez sur n'importe quelle icône pour naviguer.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#tutorial-product-grid",
      popover: {
        title: "Catalogue produits",
        description:
          "Vos produits s'affichent ici. Filtrez par catégorie en haut, " +
          "puis cliquez sur un produit pour l'ajouter au panier. " +
          "Le bouton <em>Article manuel</em> permet de saisir un prix libre.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "#tutorial-cart",
      popover: {
        title: "Panier en cours",
        description:
          "Les articles sélectionnés apparaissent ici avec le sous-total HT, " +
          "la TVA et le total TTC. Ajustez les quantités avec + et −.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#tutorial-pay-btn",
      popover: {
        title: "Encaisser",
        description:
          "Quand le panier est prêt, cliquez sur <strong>PAYER</strong> pour ouvrir l'écran de paiement. " +
          "Vous pourrez encaisser en CB, espèces, chèque ou titre-restaurant — " +
          "et même diviser la note entre plusieurs personnes.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#tutorial-nav-historique",
      popover: {
        title: "Historique",
        description:
          "Retrouvez toutes les ventes passées avec leurs détails, " +
          "montants et modes de paiement. Réimprimez un ticket à tout moment.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "#tutorial-nav-inventaire",
      popover: {
        title: "Inventaire",
        description:
          "Créez et gérez vos produits, catégories et taux de TVA. " +
          "Activez le suivi de stock par produit pour recevoir des alertes de rupture.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "#tutorial-nav-cloture",
      popover: {
        title: "Clôture Z",
        description:
          "En fin de journée, effectuez la <strong>clôture Z</strong> pour fermer la session. " +
          "Elle génère un rapport détaillé par taux de TVA et par mode de paiement, " +
          "et verrouille les données fiscales de la journée.",
        side: "right",
        align: "center",
      },
    },
    ...(hasTables
      ? [
          {
            element: "#tutorial-nav-tables",
            popover: {
              title: "Plan de salle",
              description:
                "Gérez vos tables en temps réel : ouvrez des additions, " +
                "ajoutez des articles depuis la table, répartissez la note " +
                "entre convives et encaissez directement.",
              side: "right" as const,
              align: "center" as const,
            },
          },
        ]
      : []),
    {
      element: "#tutorial-nav-parametres",
      popover: {
        title: "Paramètres",
        description:
          "Configurez l'imprimante, le tiroir-caisse, l'écran client et votre profil commercial. " +
          "L'onglet <em>Conformité NF525</em> permet de vérifier la chaîne de hachage et d'exporter l'archive fiscale.",
        side: "right",
        align: "center",
      },
    },
  ];

  const driverObj = driver({
    showProgress: true,
    nextBtnText: "Suivant →",
    prevBtnText: "← Retour",
    doneBtnText: "Terminer",
    progressText: "{{current}} / {{total}}",
    steps,
    onDestroyed: () => {
      updateSetting("tutorial_done", "true").catch(() => {});
    },
  });

  driverObj.drive();
}
