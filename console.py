import numpy as np


def transport_coin_nord_ouest():
    print("--- Résolution Problème de Transport (Coin Nord-Ouest) ---")

    # 1. Saisie des dimensions
    n_sources = int(input("Nombre de sources (origines) : "))
    n_destinations = int(input("Nombre de destinations : "))

    # 2. Saisie de l'offre et de la demande
    print(f"\nEntrez les {n_sources} valeurs d'offre (ex: 20 30 50) :")
    offre = list(map(float, input().split()))

    print(f"\nEntrez les {n_destinations} valeurs de demande (ex: 40 30 30) :")
    demande = list(map(float, input().split()))

    if sum(offre) != sum(demande):
        print("\nErreur : L'offre totale doit être égale à la demande totale.")
        return

    # 3. Saisie de la matrice des coûts
    print("\nEntrez les coûts unitaires ligne par ligne :")
    couts = []
    for i in range(n_sources):
        ligne = list(map(float, input(f"Coûts pour la source {i + 1} : ").split()))
        couts.append(ligne)
    couts = np.array(couts)

    # 4. Algorithme du Coin Nord-Ouest
    transport = np.zeros((n_sources, n_destinations))
    i, j = 0, 0
    s, d = offre.copy(), demande.copy()

    while i < n_sources and j < n_destinations:
        # On prend le minimum entre l'offre et la demande disponible
        quantite = min(s[i], d[j])
        transport[i][j] = quantite

        s[i] -= quantite
        d[j] -= quantite

        # Déplacement : vers le bas si offre épuisée, vers la droite si demande satisfaite
        if s[i] == 0:
            i += 1
        else:
            j += 1

    # 5. Calcul du coût total
    cout_total = np.sum(transport * couts)

    # Affichage des résultats
    print("\n" + "=" * 30)
    print("MATRICE DE TRANSPORT (Unités envoyées) :")
    print(transport)
    print(f"\nCOÛT TOTAL DU TRANSPORT : {cout_total:.2f}")
    print("=" * 30)


if __name__ == "__main__":
    transport_coin_nord_ouest()
