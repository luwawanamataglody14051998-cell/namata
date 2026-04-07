# 📦 Solveur du problème de transport – Méthode du Coin Nord-Ouest

## 🧠 Description

Ce projet implémente une application graphique en Python permettant de résoudre un **problème de transport (Monge-Kantorovich)** en utilisant la **méthode du Coin Nord-Ouest**.

L'application permet à l’utilisateur de :
- saisir les données (offres, demandes, coûts),
- générer un plan de transport initial,
- calculer automatiquement le coût total associé.

---

## 🎯 Objectif

Trouver une solution réalisable initiale pour le problème de transport en minimisant le coût total :

\[
Z = \sum_{i=1}^{n} \sum_{j=1}^{m} c_{ij} \cdot x_{ij}
\]

où :
- \( x_{ij} \) : quantité transportée de l’origine \( i \) vers la destination \( j \)  
- \( c_{ij} \) : coût unitaire associé  

---

## ⚙️ Méthode utilisée

### 🔹 Méthode du Coin Nord-Ouest

Algorithme heuristique permettant de construire une solution initiale en :

1. Partant de la cellule (1,1)
2. Allouant le minimum entre offre et demande
3. Se déplaçant vers :
   - la ligne suivante si l’offre est épuisée
   - la colonne suivante sinon

---

## 🖥️ Interface utilisateur

L’application utilise **Tkinter** pour offrir une interface simple et interactive.

### 🔹 Entrées requises :
- Nombre d’origines  
- Nombre de destinations  
- Valeurs d’offre (ex : `20 30 50`)  
- Valeurs de demande (ex : `40 30 30`)  
- Matrice des coûts  
  - lignes séparées par `;`
  - colonnes séparées par espace  
  - Exemple :  
    ```
    2 3 1;
    5 4 8;
    5 6 8
    ```

---

## ▶️ Exécution

### 🔧 Prérequis
- Python 3.x

### 🚀 Lancer le programme

```bash
python main.py
