
// load up the user model
var LocalStrategy    = require('passport-local').Strategy;
var configDB = require('./database.js');
var Sequelize = require('sequelize');

var sequelize = new Sequelize(configDB.url);

var User = sequelize.import('../app/models/user');

User.sync();

module.exports = function(passport) {



    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id).then(function(user){
			done(null, user);
		}).catch(function(e){
			done(e, false);
		});
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },

    function(req, email, password, done) {
			User.findOne({ where: { localemail: email }})
				.then(function(user) {
					if (!user) {
						done(null, false, req.flash('loginMessage', 'Unknown user'));
					} else if (!user.validPassword(password)) {
						done(null, false, req.flash('loginMessage', 'Wrong password'));
					} else {
						done(null, user);
					}
				})
				.catch(function(e) {
					done(null, false, req.flash('loginMessage',e.name + " " + e.message));
				});
	}));



    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
		//  Whether we're signing up or connecting an account, we'll need
		//  to know if the email address is in use.

		User.findOne({ where: { localemail: email }})
			.then(function(existingUser) {

				// check to see if there's already a user with that email
				if (existingUser)
					return done(null, false, req.flash('loginMessage', 'That email is already taken.'));

				//  If we're logged in, we're connecting a new local account.
				if(req.user) {
					var user            = req.user;
					user.localemail    = email;
					user.localpassword = User.generateHash(password);
					user.save().catch(function (err) {
						throw err;
					}).then (function() {
						done(null, user);
					});
				}
				//  We're not logged in, so we're creating a brand new user.
				else {
					// create the user
					var newUser = User.build ({localemail: email, localpassword: User.generateHash(password)});
					newUser.save().then(function() {done (null, newUser);}).catch(function(err) { done(null, false, req.flash('loginMessage', err));});
				}
			})
			.catch(function (e) {
				done(null, false, req.flash('loginMessage',e.name + " " + e.message));
			})

    }));
}
