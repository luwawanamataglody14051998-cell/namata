import tkinter as tk
from tkinter import messagebox


class TransportApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Solveur Monge-Kantorovich")
        self.root.geometry("600x750")
        self.root.configure(bg="#f0f2f5")

        # --- TITRE ---
        tk.Label(root, text="MÉTHODE DU COIN NORD-OUEST", font=("Helvetica", 14, "bold"),
                 bg="#2c3e50", fg="white", pady=15).pack(fill="x")

        # 1. DIMENSIONS
        frame_dims = tk.Frame(root, bg="#f0f2f5")
        frame_dims.pack(pady=10)
        tk.Label(frame_dims, text="Nombre des orgines :", bg="#f0f2f5").grid(row=0, column=0, padx=5)
        self.entry_n_s = tk.Entry(frame_dims, width=5)
        self.entry_n_s.grid(row=0, column=1)
        tk.Label(frame_dims, text="Nombre de Destinations :", bg="#f0f2f5").grid(row=0, column=2, padx=5)
        self.entry_n_d = tk.Entry(frame_dims, width=5)
        self.entry_n_d.grid(row=0, column=3)

        # 2. OFFRE
        tk.Label(root, text="Entrez les valeurs d'offre (ex: 20 30 50) :", font=("bold", 10)).pack(pady=5)
        self.entry_offre = tk.Entry(root, width=55)
        self.entry_offre.pack(pady=5)

        # 3. DEMANDE
        tk.Label(root, text="Entrez les valeurs de demande (ex: 40 30 30) :", font=("bold", 10)).pack(pady=5)
        self.entry_demande = tk.Entry(root, width=55)
        self.entry_demande.pack(pady=5)

        # 4. COÛTS
        tk.Label(root, text="Entrez les coûts unitaires (lignes séparées par ';' et colonnes par ' ') :",
                 font=("bold", 10)).pack(pady=5)
        self.entry_couts = tk.Entry(root, width=55)
        self.entry_couts.pack(pady=5)

        # BOUTON
        tk.Button(root, text="CALCULER LE COÛT TOTAL", command=self.calculer,
                  bg="#27ae60", fg="white", font=("bold", 12), pady=10).pack(pady=20)

        # RÉSULTAT
        self.res_var = tk.StringVar(value="Résultat ici...")
        tk.Label(root, textvariable=self.res_var, justify="left", font=("Courier", 10),
                 bg="white", relief="sunken", width=60, height=12).pack(pady=10)

    def calculer(self):
        try:
            n_s = int(self.entry_n_s.get())
            n_d = int(self.entry_n_d.get())
            offre = [float(x) for x in self.entry_offre.get().split()]
            demande = [float(x) for x in self.entry_demande.get().split()]

            # Transformation des coûts en liste de listes (sans numpy)
            lignes = self.entry_couts.get().split(';')
            couts = [[float(x) for x in l.split()] for l in lignes]

            if len(offre) != n_s or len(demande) != n_d:
                messagebox.showerror("Erreur", "Le nombre de valeurs ne correspond pas aux dimensions.")
                return

            # Algo Coin Nord-Ouest
            transport = [[0.0 for _ in range(n_d)] for _ in range(n_s)]
            i, j = 0, 0
            s_copie, d_copie = offre.copy(), demande.copy()

            while i < n_s and j < n_d:
                q = min(s_copie[i], d_copie[j])
                transport[i][j] = q
                s_copie[i] -= q
                d_copie[j] -= q
                if s_copie[i] == 0:
                    i += 1
                else:
                    j += 1

            # Calcul du coût total
            total = 0
            for r in range(n_s):
                for c in range(n_d):
                    total += transport[r][c] * couts[r][c]

            res_str = "Plan de transport :\n"
            for ligne in transport:
                res_str += f"{ligne}\n"
            res_str += f"\nCOÛT TOTAL : {total:,.2f}"
            self.res_var.set(res_str)

        except Exception as e:
            messagebox.showerror("Erreur", "Vérifiez vos données.")


if __name__ == "__main__":
    root = tk.Tk()
    app = TransportApp(root)
    root.mainloop()
