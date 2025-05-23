const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwtUtil = require("jsonwebtoken");
const app = express();
const jwtParser = require("./jwt-parser");
const connection = require("./connection-db");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("hello");
});

app.post("/inscription", (req, res) => {
  const utilisateur = req.body;

  bcrypt.hash(utilisateur.password, 10, (err, hash) => {
    connection.query(
      "INSERT INTO utilisateur(email, password) VALUES (?,?)",
      [utilisateur.email, hash],
      (err, resultat) => {
        if (err) {
          console.debug(err);
          return res.sendStatus(500);
        }

        res.json({ message: "utilsateur enregistré" });
      }
    );
  });
});

app.post("/connexion", (req, res) => {
  const utilisateur = req.body;

  connection.query(
    "SELECT * FROM utilisateur WHERE email = ?",
    [utilisateur.email],
    (err, resultat) => {
      if (err) {
        console.debug(err);
        return res.sendStatus(500);
      }

      if (resultat.length != 1) {
        return res.sendStatus(401);
      }

      bcrypt.compare(
        utilisateur.password,
        resultat[0].password,
        (err, compatible) => {
          if (err) {
            console.debug(err);
            return res.sendStatus(500);
          }

          if (compatible) {
            return res.send(
              jwtUtil.sign({ email: utilisateur.email }, "azerty123")
            );
          }

          return res.sendStatus(401);
        }
      );
    }
  );
});

app.get("/produits", jwtParser, (req, res) => {
  connection.query("SELECT * FROM produit", (err, produits) => {
    res.json(produits);
  });
});

app.get("/produit/:id", jwtParser, (req, res) => {
  const id = req.params.id;

  connection.query(
    "SELECT * FROM produit WHERE id = ?",
    [id],
    (err, produits) => {
      if (err) {
        console.debug(err);
        return res.sendStatus(500);
      }

      if (produits.length == 0) {
        return res.sendStatus(404);
      }

      // res.json({
      //   nom: produits[0].produit_nom,
      //   description: produits[0].description,
      //   prix: produits[0].prix,
      // });

      //res.json({ ...produits[0], nom: produits[0].produit_nom });

      res.json(produits[0]);
    }
  );
});

app.post("/produit", jwtParser, (req, res) => {
  const produit = req.body;

  if (
    produit.nom == null ||
    produit.nom.length < 3 ||
    produit.nom.length > 20 ||
    (produit.description && produit.description.length > 50) ||
    produit.prix < 0.01
  ) {
    return res.sendStatus(400); //bad request
  }

  connection.query(
    "SELECT * FROM produit WHERE nom = ?",
    [produit.nom],
    (err, lignes) => {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      }

      //un produit porte déjà le nom saisi
      if (lignes.length >= 1) {
        return res.sendStatus(409); //conflict
      }

      connection.query(
        "INSERT INTO produit (nom, description, prix, utilisateur_id) VALUES (?,?,?,?)",
        [produit.nom, produit.description, produit.prix, req.user.id],
        (err, lignes) => {
          if (err) {
            console.log(err);
            return res.sendStatus(500);
          }

          res.json(produit);
        }
      );
    }
  );
});

app.put("/produit/:id", jwtParser, (req, res) => {
  const id = req.params.id;
  const produit = req.body;
  produit.id = id;

  //validation des données
  if (
    produit.nom == null ||
    produit.nom.length < 3 ||
    produit.nom.length > 20 ||
    (produit.description && produit.description.length > 50) ||
    produit.prix < 0.01
  ) {
    return res.sendStatus(400); //bad request
  }

  connection.query(
    "SELECT * FROM produit WHERE nom = ? AND id != ?",
    [produit.nom, id],
    (err, lignes) => {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      }

      //un produit porte déjà le nom saisi
      if (lignes.length >= 1) {
        return res.sendStatus(409); //conflict
      }

      connection.query(
        "UPDATE produit SET nom = ?, description = ?, prix = ? WHERE id = ?",
        [produit.nom, produit.description, produit.prix, id],
        (err, lignes) => {
          console.log(lignes);

          if (err) {
            console.log(err);
            return res.sendStatus(500);
          }

          res.json(produit);
        }
      );
    }
  );
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
