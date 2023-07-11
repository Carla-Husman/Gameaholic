const cookieParser = require('cookie-parser'); //laborator 11
const session = require("express-session"); //laborator 11
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
app.use(cookieParser()); //laborator 11
app.use(session({ //luat din curs
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 3600000 // 1 ora
    }
})); // laborator 11

const port = 6789;

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');

// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views / layout.ejs
app.use(expressLayouts);

// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))

// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());

// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res

// DE AICI ESTE IMPLEMENTAT DE MINE
const fs = require('fs');
var listaIntrebari;
// Citirea asincronă a fișierului cu întrebări
fs.readFile('intrebari.json', (err, data) => {
    if (err) {
        console.error("Eroare la citirea fișierului intrebari.json :", err);
        return;
    }
    listaIntrebari = JSON.parse(data).intrebari;
});

// RESURSA INEXISTENTĂ
// Crearea unei liste de accesuri inexistente și a unui obiect pentru a stoca contorul pentru fiecare resursă
var useriBlocati = [];
const listaResurse = [
    "/",
    "/admin",
    "/autentificare",
    "/chestionar",
    "/index",
    "/rezultat-chestionar",
    "/vizualizare-cos"
];

// Funcția pentru blocarea unui utilizator
function blocareUtilizator(user) {
    useriBlocati.push(user);
    setTimeout(() => {
        deblocareUtilizator(user);
    }, 10000); // blocat 10 secunde
}

// Funcția pentru deblocarea unui utilizator
function deblocareUtilizator(user) {
    let index = useriBlocati.findIndex(json => json.utilizator === user.utilizator);

    if (index !== -1) 
        useriBlocati.splice(index, 1);

    console.log( "Userul care trebuie deblocat a fost gasit la indexul" + index + "  Lista arata asa acum: " + useriBlocati);
}

// Adăugare middleware 
// Asta va face ca variabila mea utilizatorAutentificat să fie accesibilă în toate ejsurile
app.use(function (req, res, next) {
    res.locals.utilizatorAutentificat = (req.session.user != null) ? req.session.user : null;

    const resource = req.path;

    // Verificarea dacă resursa este inexistentă
    if (resource == "/resursa-invalida") {
        blocareUtilizator(req.session.user); // Adaugarea utilizatorului la lista celor blocati
        return res.render("blocat");
    }

    next();
});

var flagUpdate = 0; // Flag pentru a urmări dacă în baza de date s-a realizat o schimbare
var lista = []; // Listă în care pun produsele din baza de date pentru a le trimite către ejs

// Am avut nevoie de async ca să aștept modificările
app.get('/', async (req, res) => {
    if (useriBlocati.some(item => JSON.stringify(item) === JSON.stringify(req.session.user))) {
        res.render("blocat");
    } else {
        let currentUser = null;

        //daca cineva s-a autentificat, setez utilizatorul
        if (req.cookies["utilizatorCookie"] != null)
            currentUser = req.cookies["utilizatorCookie"];

        //adaug in variabila lista doar daca tabela este populata
        //sau daca s-a facut un update in baza de date (+produs nou)
        if (database != null) {
            const produse = database.collection("produse");
            const count_documents = await produse.countDocuments();
            if (count_documents != flagUpdate) {
                try {
                    flagUpdate = count_documents;
                    const aggregateResult = await produse.aggregate([]).toArray();
                    lista = aggregateResult;
                } catch (err) {
                    console.error("Eroare la citirea produselor:", err);
                }
            }
        }

        res.render("index",
            {
                "utilizatorCurent": currentUser,
                "listaProduse": lista
            });
    }
});

//app.get('/', (req, res) => res.send('Hello World'));

app.get('/chestionar', (req, res) => {
    if (useriBlocati.some(item => JSON.stringify(item) === JSON.stringify(req.session.user))) 
        res.render("blocat");
    else 
        res.render('chestionar', { intrebari: listaIntrebari });
});

app.post('/rezultat-chestionar', (req, res) => {

    var raspunsuri = req.body;

    var raspunsuriCorecte = 0;

    for (var i = 0; i < listaIntrebari.length; ++i)
        if (raspunsuri["varianta" + i] == listaIntrebari[i].corect)
            raspunsuriCorecte++;

    res.redirect('/rezultat-chestionar?corecte=' + raspunsuriCorecte);
});

app.get('/rezultat-chestionar', (req, res) => {
    if (useriBlocati.some(item => JSON.stringify(item) === JSON.stringify(req.session.user))) {
        res.render("blocat");
    } else {
        res.render('rezultat-chestionar',
            {
                punctajTotal: listaIntrebari.length,
                rezultat: req.query.corecte
            });
    }
});

//PARTEA DE AUTENTIFICARE ȘI BLOCARE UTILIZATOR
var listaAutentificariNereusiteScurt =[];
var listaAutentificariNereusiteLung =[];
const limitaIntervalScurt = 2; // Autentificările nereușite permise pentru intervalul SCURT
const limitaIntervalLung = 3; // Autentificările nereușite permise pentru intervalul LUNG
const durataIntervalScurt = 10000; // 10 secunde 
const durataIntervalLung = 60000; // 1 minut

// Funcția pentru blocarea unui utilizator să se mai autentifice
function blocareUtilizatorAutentificare(username, tipInterval) {
    setTimeout(() => {
        deblocareUtilizatorAutentificare(username, tipInterval);
    }, 10000); // blocat 10 secunde
}

// Funcția pentru deblocarea unui utilizator
function deblocareUtilizatorAutentificare(username, tipInterval) {
    // Dacă tipul inetrvalului e scurt, atunci șterg utilizatorul din lista respectivă
    if(tipInterval == 1){
        index = listaAutentificariNereusiteScurt.findIndex(json => json.utilizator === username);
        console.log("Deblocare autentificare interval scurt... " + index);
        if (index !== -1) 
            listaAutentificariNereusiteScurt.splice(index, 1);
    }

    // Dacă tipul inetrvalului este lung, atunci șterg utilizatorul din lista respectivă
    if(tipInterval == 2){
        index = listaAutentificariNereusiteLung.findIndex(json => json.utilizator === username);
        console.log("Deblocare autentificare interval lung... " + index);
        if (index !== -1) 
            listaAutentificariNereusiteLung.splice(index, 1);
    }
    
}

app.get('/autentificare', (req, res) => {
    if (useriBlocati.some(item => JSON.stringify(item) === JSON.stringify(req.session.user))) {
        res.render("blocat");
    } else {
        let mesajEroare = "";

        // Verificăm dacă avem mesaj de eroare în cookie
        if (req.cookies["mesajEroareCookie"] != null)
            mesajEroare = req.cookies["mesajEroareCookie"];

        // Ștergem utilizatorul din sesiune
        if (req.session.user)
            delete req.session.user;
        // req.session.destroy();

        // Ștergem cookie-ul cu mesajul de eroare și randăm pagina de 
        // autentificare unde se va afișa mesajul de eroare
        res
            //.clearCookie("utilizatorCookie")
            .clearCookie("mesajEroareCookie")
            .render('autentificare', { mesajEroare: mesajEroare });
    }
});

// Funcția mă ajută să gestionez mai ușor cele două liste
var returnValue = false;
function GestionareaListelorDeBlocare(listaAuten, numeUtilizator, tipInterval, acum, durataInterval, limitaInterval) {

    index = listaAuten.findIndex(json => json.utilizator === numeUtilizator);

    if (index != -1) { // Există deja în listă utilizatorul
        // Dacă a trecut timpul, utilizatorul este șters din listă
        if (acum - listaAuten[index].timpInceputInterval >= durataInterval) {
            console.log("Timpul pentru intervalul (" + tipInterval + ") a expirat, utilizatorul va fi șters...");
            listaAuten.splice(index, 1);
            index = -1;
        }
        // Dacă utilizatorul a atins limita de autentificări, este blocat
        else if (listaAuten[index].numarAutentificari == limitaInterval) {
            if (listaAuten[index].blocat == 0) {
                listaAuten[index].blocat == 1;
                returnValue = true;
                blocareUtilizatorAutentificare(listaAuten[index].utilizator, tipInterval);
            }
        }
    }

    return index;
}

// Funcția care adaugă în una dintre cele două liste
function AdaugareInListaDeBlocare(listaAutentificari, index, numeUtilizator, acum){
    if (index !== -1) { // Găsit
        listaAutentificari[index].numarAutentificari++;
    } else { // Dacă nu a fost găsit, îl adăugăm
        let util = {
            utilizator: numeUtilizator,
            numarAutentificari: 1,
            timpInceputInterval: acum,
            blocat: 0
        };
        listaAutentificari.push(util);
    }
}

app.post('/verificare-autentificare', (req, res) => {
    // Afișare în consolă a requestului
    console.log(req.body);

    // Dacă nu pun asta aici, după ce dau logout, mi se șterge tot din lista de utilizatori
    const listaUtilizatori = JSON.parse(fs.readFileSync('utilizatori.json'))["utilizatori"];

    // Ștergem din cookieul mesajEroare vechiul mesaj
    res.clearCookie("mesajEroareCookie");

    // Setez utilizatorul curent pe null
    //let currentUser = null;

    var indexScurt = -1;
    var indexLung = -1; 
    var flagS = false;
    var flagL = false;
    const acum = Date.now();

    // Gestionarea listei de autentificări nereușite
    if (listaAutentificariNereusiteScurt.length > 0) {
        indexScurt = GestionareaListelorDeBlocare(listaAutentificariNereusiteScurt, req.body.numeUtilizator, 1, acum, durataIntervalScurt, limitaIntervalScurt);
        if(returnValue){
            returnValue = false;
            flagS = true;
        }
    }

    if (listaAutentificariNereusiteLung.length > 0) {
        indexLung = GestionareaListelorDeBlocare(listaAutentificariNereusiteLung, req.body.numeUtilizator, 2, acum, durataIntervalLung, limitaIntervalLung);
        if(returnValue){
            returnValue = false;
            flagL = true;
        }
    }

    if(flagL || flagS){
        res
            .cookie("mesajEroareCookie", "Ai depășit nr. maxim de înregistrări. Încearcă din nou mai târziu.")
            .redirect(302, "autentificare"); 
        return;
    }

    // Parcurgem lista de utilizatori pentru a verificare existența userului
    for (var i = 0; i < listaUtilizatori.length; ++i) {
        if (req.body.numeUtilizator == listaUtilizatori[i].utilizator && req.body.parola == listaUtilizatori[i].parola) {
            // Setez utilizatorul dacă există apoi șterg parola pentru că nu trebuie trimisă
            currentUser = listaUtilizatori[i];
            delete currentUser["parola"];

            req.session.user = currentUser; // Setam userul pentru session

            // Dacă utilizatorul este admin, facem redirect către pagina de admin
            if (req.session.user.utilizator == "admin") {
                res.redirect(302, "/admin");
                return;
            }

            // Setam cookieul numeUtilizator cu valoarea numelui utilizatorului scris în interfață
            // apoi redirecționam către pagina inițială
            res
                //.cookie("utilizatorCookie", currentUser)
                .redirect(302, "/");

            return;
        } else if (req.body.numeUtilizator == listaUtilizatori[i].utilizator && req.body.parola != listaUtilizatori[i].parola) {
            AdaugareInListaDeBlocare(listaAutentificariNereusiteScurt, indexScurt, req.body.numeUtilizator, acum);
            AdaugareInListaDeBlocare(listaAutentificariNereusiteLung, indexLung, req.body.numeUtilizator, acum);
        }
    }

    // Dacă userul nu a fost găsit în lista de utilizatori
    // setăm cookieul mesajEroare, apoi redirecționăm către pagina autentificare
    // unde se va afișa mesajul de eroare
    res
        //.cookie("utilizatorCookie", currentUser)
        .cookie("mesajEroareCookie", "Nume utilizator sau parolă greșite.")
        .redirect(302, "autentificare");
});

//BAZA DE DATE
const { MongoClient } = require('mongodb');
var uri = null;
var client = null;
var database = null;

// Am avut nevoie de async ca să aștept modificările
app.get('/creare-bd', async (req, res) => {
    if (useriBlocati.some(item => JSON.stringify(item) === JSON.stringify(req.session.user))) {
        res.render("blocat");
    } else {
        // Conectare la baza de date și creare tabelă
        try {
            uri = "mongodb://127.0.0.1:27017/cumparaturi";
            client = new MongoClient(uri);
            await client.connect();
            console.log("Conectat!");

            database = client.db("cumparaturi");

            try {
                populareListaDoarOdata = false;
                await database.createCollection("produse");
                console.log("Tabelă creată cu succes!");
            } catch (e) {
                console.log("Tabela deja există!");
            }
        } catch (e) {
            console.log(e);
        } finally {
            //await client.close();
        }

        if (req.session.user != null && req.session.user['utilizator'] == "admin")
            res.redirect("/admin");
        else
            res.redirect("/");
    }
});

var listaProduse = [
    {
        "nume_produs": "Metin 2",
        "pret": "20",
        "img_src": "metin_2.jpg"
    },
    {
        "nume_produs": "Hogwarts Legacy",
        "pret": "35",
        "img_src": "hogwarts_legacy.jpg"
    },
    {
        "nume_produs": "Age of Wonders 4",
        "pret": "34",
        "img_src": "age_of_wonders4.jpg"
    },
    {
        "nume_produs": "For Honor",
        "pret": "36",
        "img_src": "for_honor.jpg"
    },
    {
        "nume_produs": "Lost Ark",
        "pret": "40",
        "img_src": "lost_ark.jpg"
    },
    {
        "nume_produs": "The Elder Scrolls V: Skyrim",
        "pret": "39",
        "img_src": "the_elder_scrolls_v_skyrim.jpg"
    },
    {
        "nume_produs": "Minecraft",
        "pret": "10",
        "img_src": "minecraft.jpg"
    },
    {
        "nume_produs": "The Last Of Us Part I",
        "pret": "41",
        "img_src": "the_last_of_us_part_I.jpg"
    },
    {
        "nume_produs": "Valorant",
        "pret": "25",
        "img_src": "valorant.jpg"
    }
];

// Am avut nevoie de async ca să aștept modificările
app.get('/inserare-bd', async (req, res) => {
    if (useriBlocati.some(item => JSON.stringify(item) === JSON.stringify(req.session.user))) {
        res.render("blocat");
    } else {
        //adaugare in baza de date
        if (database == null) {
            console.log("Nu se poate insera, baza de date neconectata");
        } else {
            const produse = database.collection("produse");

            try {
                const count_documents = await produse.countDocuments();
                
                if (count_documents == 0) { //daca nu avem colecția populată, atunci adăugăm
                    for (var i = 0; i < listaProduse.length; ++i) {
                        const produs = { //se creează document pentru fiecare produs și se adaugă în baza de date
                            nume_produs: listaProduse[i].nume_produs,
                            pret: listaProduse[i].pret,
                            img_src: listaProduse[i].img_src
                        };
                        await produse.insertOne(produs);
                    }
                } else {
                    console.log("Tabelă populată.");
                }
            } catch (err) {
                console.log(err.Message);
            }
        }

        if (req.session.user != null && req.session.user['utilizator'] == "admin") {
            res.redirect("/admin");
            return;
        }

        res.redirect("/");
    }
});

// PARTEA DE COȘ DE CUMPĂRĂTURI
app.post('/adaugare-cos', (req, res) => {
    if (req.body.id_produs) {
        if (!req.session.cosCumparaturi)
            req.session.cosCumparaturi = [];
        
        let exist = false;

        // Verific daca perechea id-utilizator exista deja in cos
        req.session.cosCumparaturi.forEach((produsCos) => {
            if (produsCos["_id"] == req.body.id_produs && produsCos["username"] == req.session.user.utilizator) {
                produsCos["nr_produse"]++;
                exist = true;
                return;
            }
        });
       
        if (exist === false) {  // Dacă nu există perechea, o adaug
            req.session.cosCumparaturi.push(
                {
                    username: req.session.user.utilizator,
                    _id: req.body.id_produs,
                    nr_produse: 1
                }
            );
        }
    }

    console.log(req.session.cosCumparaturi);

    res.redirect("/");
});

app.get('/vizualizare-cos', (req, res) => {
    if (useriBlocati.some(item => JSON.stringify(item) === JSON.stringify(req.session.user))) {
        res.render("blocat");
    } else {
        var produseCos = [];

        if (req.session.cosCumparaturi && req.session.cosCumparaturi.length > 0) {
            req.session.cosCumparaturi.forEach((produs) => {
                if (produs.username == req.session.user.utilizator) {
                    const i = lista.find((item) => item.nume_produs === produs._id);
                    i.nr_produse = produs.nr_produse;
                    produseCos.push(i);
                }
            });
        }

        res.render("vizualizare-cos",  { produseDinCos: produseCos });
    }
});

// PARTEA DE ADMIN
let mesajEroare = "";
app.get('/admin', (req, res) => {
    res.render('admin', { mesajEroare: mesajEroare });
});

// Interogehez baza de date, deci folosesc async ca să blochez firul de execuție
// Dacă nu folosesc async, comportamentul nu este corect, am fost nevoită
app.post('/verificare-adaugare-produs', async (req, res) => {
    try {
        let numeAdaugat = req.body.nume_produs;
        let pretAdaugat = req.body.pret + "";
        let srcAdaugat = req.body.img_src;

        // Verific dacă există valori necompletate sau caractere speciale în datele introduse
        // Folosesc operatorul de egalitate strictă ca să evit atacurile
        if (numeAdaugat.trim() === "" || pretAdaugat.trim() === "" || srcAdaugat.trim() === "") {
            mesajEroare = "Toate câmpurile trebuie completate";
            return res.redirect(302, "admin");
        }

        const regex = /[!@#$%^&*()_+\-=[\]{};'"\\|,<>/?]/;
        if (regex.test(numeAdaugat) || regex.test(srcAdaugat)) {
            mesajEroare = "Nu sunt permise caracterele speciale";
            return res.redirect(302, "admin");
        }

        if(database == null){ //daca baza de date este null, realizez conexiunea
            client = new MongoClient(uri);
            database = client.db('cumparaturi');
        }
        
        // Verific dacă produsul există deja în baza de date
        const collection = database.collection('produse');
        const produsExistent = await collection.findOne({ nume_produs: numeAdaugat });
        if (produsExistent) {
            mesajEroare = "Produsul există deja";
            return res.redirect(302, "admin");
        }

        // Adaug produsul în baza de date
        const produsNou = {
            nume_produs: numeAdaugat,
            pret: pretAdaugat,
            img_src: srcAdaugat
        };
        const rezultatAdaugare = await collection.insertOne(produsNou);
        mesajEroare = "Produs adăugat cu succes.";
        res.redirect(302, "admin");
    } catch (err) {
        console.error("Eroare:", err);
        mesajEroare = "A apărut o eroare în timpul procesării cererii";
        res.redirect(302, "admin");
    }
});

app.listen(port, () => console.log("Serverul rulează la adresa http://localhost:"));

// Închiderea bazei de date
// ca să nu o deschid/inchid de fiecare dată când o folosesc
function closeConnection() {
    client.close().then(() => {
        console.log("Conexiunea la baza de date a fost închisă");
    }).catch((err) => {
        console.error("Eroare la închiderea conexiunii la baza de date:", err);
    });
}

const inchidereAplicatie = () => {
    closeConnection().then(() => {
        console.log("Conexiunea la baza de date a fost închisă");
        process.exit(0);
    }).catch((err) => {
        console.error("Eroare la închiderea conexiunii la baza de date:", err);
        process.exit(1);
    });
};

process.on("SIGINT", inchidereAplicatie); // Semnal de întrerupere (Ctrl+C)