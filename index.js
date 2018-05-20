const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Sequelize = require('sequelize');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = new Sequelize('twitter','root','',{
    host: 'localhost',
    dialect: 'mysql'
});

const COOKIE_SECRET = 'cookie secret';

const User = db.define('user', {
    pseudo : { type: Sequelize.STRING } ,
    firstname : { type: Sequelize.STRING } ,
    lastname : { type: Sequelize.STRING } ,
    email : { type: Sequelize.STRING } ,
    password : { type: Sequelize.STRING }
});

const Actu = db.define('actu', {
    content: { type: Sequelize.STRING },


});

const Comment = db.define('comment', {
    commentaire: { type: Sequelize.STRING },
});

const Jaime = db.define('aime', {
    action: {
        type: Sequelize.ENUM('aime')
    }
});

const Jaimepa = db.define('aimepa', {
    action: {
        type: Sequelize.ENUM('aimpa')
    }
});

db.sync().then(r => {
    console.log("DB SYNCED");
}).catch(e => {
    console.error(e);
});

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded());

passport.use(new LocalStrategy((email, password, done) => {
    User
        .findOne({
            where: {email, password}
        }).then(function (user) {
        if (user) {
            return done(null, user)
        } else {
            return done(null, false, {
                message: 'Invalid credentials'
            });
        }
    })

        .catch(done);
}));


passport.serializeUser((user, cookieBuilder) => {
    cookieBuilder(null, user.email);
});

passport.deserializeUser((email, cb) => {
    console.log("AUTH ATTEMPT",email);

    User.findOne({
        where : { email }
    }).then(r => {
        if(r) return cb(null, r);
        else return cb(new Error("No user corresponding to the cookie's email address"));
    });
});

app.use(cookieParser(COOKIE_SECRET));

app.use(bodyParser.urlencoded({ extended: true }));

// Keep track of user sessions
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/',(req,res) => {
    Actu
        .sync()
        .then(() => {
            Actu
                .findAll({include:[Jaime, Jaimepa,  {model: Comment,include:[User]}, User ]})
                .then((actus) => {
                    console.log(actus);
                    res.render( 'fildactu', { actus, user : req.user});
                })
        })

});

app.get('/actu',(req,res) => {
    res.render('poste');
});

app.post('/actu', (req, res) => {
    const { content } = req.body;
    Actu
        .sync()
        .then(() => Actu.create({ content, userId: req.user.id }))
        .then(() => res.redirect('/'));
});


app.get('/login', (req, res) => {
    // Render the login page
    res.render('login');
});

app.post('/login',
    // Authenticate user when the login form is submitted
    passport.authenticate('local', {
        // If authentication succeeded, redirect to the home page
        successRedirect: '/',
        // If authentication failed, redirect to the login page
        failureRedirect: '/login'
    })
);

app.get('/auth',(req,res) => {
    res.render('inscription');
});

app.post('/auth', (req, res) => {
    const { pseudo, firstname, lastname, email, password } = req.body;
    User
        .sync()
        .then(() => User.create({ pseudo, firstname, lastname, email, password  }))
        .then(() => res.redirect('/'));
});


app.post('/comment/:actuId', (req, res) => {
    const { commentaire } = req.body;
    Comment
        .sync()
        .then(() => Comment.create({ commentaire, actuId: req.params.actuId, userId: req.user.id }))
        .then(() => res.redirect('/'));
});

app.post('/actu/:actuId/aime', (req, res) => {
    Jaime
        .sync()
        .then(() => Jaime.create({ action: 'aime', actuId: req.params.actuId }))
        .then(()=> res.redirect('/'));
});

app.post('/actu/:actuId/aimepa', (req, res) => {
    Jaimepa
        .sync()
        .then(() => Jaimepa.create({ action: 'aimepa', actuId: req.params.actuId }))
        .then(()=> res.redirect('/'));
});

Actu.hasMany(Jaime);
Jaime.belongsTo(Actu);

Actu.hasMany(Jaimepa);
Jaimepa.belongsTo(Actu);

Actu.hasMany(Comment);
Comment.belongsTo(Actu);

User.hasMany(Comment);
Comment.belongsTo(User);

User.hasMany(Actu);
Actu.belongsTo(User);

app.listen(3000);