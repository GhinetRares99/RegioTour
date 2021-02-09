var express=require('express');
var server=express(); //creare server
var path= require('path');
var app=express()

var mysql=require('mysql');
var conexiune=mysql.createConnection({
	host:"localhost",
	user:"root",
	password:"password",
	database:"regiotour"
});

const formidable = require('formidable');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const session = require('express-session');

app.use(session({
	secret: 'spass',
	resave: true,
	saveUninitialized:false
	
}));

conexiune.connect(function(err){
	if (err) {
		 console.log("Conexiune esuata!");
	}
	else{
		console.log("Conexiune efectuata cu success!");
	}

});

app.get('/pachete',function(req, res){
 conexiune.query("select * from pachete_turistice",function(err,rezultat,campuri){
	 if (err) throw err;
	 res.render('pagini/pachete',{pachete: rezultat});
  });
});

app.get('/pachet_singur/:id',function(req, res){
 var idPac = req.params.id;
 conexiune.query("select * from pachete_turistice where id_pachet="+idPac,function(err,rezultat,campuri){
	 if (err) throw err;
	 res.render('pagini/pachet_singur',{pachet_singur: rezultat[0]});
  });
});

app.set('view engine','ejs');

app.use(express.static(path.join(__dirname, "Resurse")));
app.get("/",function(req,res){
	console.log(req.session.usr);
	res.render('pagini/index');
});

async function trimiteMail(username, email){
	var transp=nodemailer.createTransport({
		serviciu: "gmail",
		secure: false,
		auth:{
		     user: "rtour.app@gmail.com",
			 pass: "Asurbanipal1"
		},
		tls:{
			rejectUnauthorized: false
		}
	});

	await transp.sendMail({
		from: "rtour.app@gmail.com",
		to: email,
		subject: "Mesaj inregistrare",
		text: "Salut! Pe RegioTour ai numele "+username+" incepand de azi, "+new Date(),
		html: "<h1>Salut!</h1><p>Pe RegioTour ai numele "+username+" incepand de azi, <span style='text-decoration:underline;color:purple;'>"+new Date()+"</span>.</p>"
	})
	console.log("Mail trimis!");
}

var parolaServer="tehniciWeb";
app.post("/inreg",function(req,res){
	var formular = formidable.IncomingForm();
	formular.parse(req, function(eroare, campuriText, campuriFisier){
		var eroare="";
		console.log(campuriText);
		
		if(campuriText.username==""){
			eroare+="Campul Username este obligatoriu!";
		}
		
		if(campuriText.nume==""){
			eroare+="Campul Nume este obligatoriu!";
		}
		
		if(campuriText.prenume==""){
			eroare+="Campul Prenume este obligatoriu!";
		}
		
		if(campuriText.parola==""){
			eroare+="Campul Parola este obligatoriu!";
		}
		
		if(campuriText.rparola==""){
			eroare+="Campul Reintroduceti parola este obligatoriu!";
		}
		
		if(campuriText.email==""){
			eroare+="Campul Email este obligatoriu!";
		}
		
		if(campuriText.parola!=campuriText.rparola){
			eroare+="Parola nu a fost reintrodusa corect!";
		}
		
		
		var chk_vedere = campuriText.vedere;
		var rez;
		
		if(chk_vedere=='on'){rez=1;}
		else {rez=0;}
		
		if(eroare==""){
			
		campuriText.username=mysql.escape(campuriText.username);
		campuriText.nume=mysql.escape(campuriText.nume);
		campuriText.prenume=mysql.escape(campuriText.prenume);
		campuriText.email=mysql.escape(campuriText.email);
		campuriText.telefon=mysql.escape(campuriText.telefon);
		var parolaCriptata=mysql.escape(crypto.scryptSync(campuriText.parola,parolaServer,45).toString("ascii"));
		rez=mysql.escape(rez);
		campuriText.culoareText=mysql.escape(campuriText.culoareText);
		
		var comanda=`insert into utilizatori(Username, Nume_utilizator, Prenume_utilizator, Email, Telefon, Parola, CuloareText, ProblemaVedere) values (${campuriText.username},${campuriText.nume},${campuriText.prenume},${campuriText.email},${campuriText.telefon},${parolaCriptata},${campuriText.culoareText}, ${rez})`;
		
		conexiune.query(comanda,function(err,rez,campuri){
			 if(err){
			   console.log(err);
			   throw err;
			 }
			 trimiteMail(campuriText.username,campuriText.email);
			 res.render("pagini/SignUp",{err:"",raspuns:"Date introduse!"});
		});
	}else{
		res.render("pagini/SignUp",{err:eroare,raspuns:eroare});
	}
	
	});
});


app.post("/login",function(req,res){
	var formular = formidable.IncomingForm();
	formular.parse(req, function(eroare, campuriText, campuriFisier){
		var eroare="";
		console.log(campuriText);
		var parolaCriptata=mysql.escape(crypto.scryptSync(campuriText.parola,parolaServer,45).toString("ascii"));
		campuriText.nume=mysql.escape(campuriText.nume);
		
		var comanda=`select id_utilizator, Username, Nume_utilizator, Prenume_utilizator, Email, Telefon, Membru, Parola, DataInregistrare, Fotografie, ProblemaVedere, CuloareText from utilizatori where Username=${campuriText.nume} and Parola=${parolaCriptata}`;
		//console.log(comanda);
		conexiune.query(comanda,function(err,rez,campuri){
			 if(err){
			   console.log(err);
			   throw err;
			 }
			 console.log(rez);
			 if(rez.length==1){
			 usr={
				 Username:rez[0].Username,
				 Email:rez[0].Email,
				 CuloareText:rez[0].CuloareText,
				 Membru:rez[0].Membru,
				 Fotografie:rez[0].Fotografie,
				 ProblemaVedere:rez[0].ProblemaVedere
			 }
			 console.log(usr);
			 console.log(rez);
			 
			 req.session.usr=usr;
			 res.render("pagini/index",{utilizator:usr});
			 
			 }
			 else{
				 res.render("pagini/index");
			 }
			 
		});
	});
	
});


app.get('/*',function(req, res){
	res.render('pagini' + req.url, function(err, rezRandare){
		if(err){
			if(err.message.includes("Failed to lookup view"))
				res.status(404).render('pagini/404_page');
			else
				throw err;
		}
		else{
			console.log(rezRandare);
			res.send(rezRandare);
		}
	});
	
	console.log(req.url);
});

app.listen(8080);
console.log('Server pornit!');