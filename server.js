var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var ObjectId = require("mongodb").ObjectId;

var http = require("http").createServer(app);
var io = require("socket.io")(http);
var bcryptjs = require("bcryptjs");

var formidable = require("formidable");
var fs = require("fs");
var session = require("express-session");
app.use(session({
    key: "admin",
    secret: "any random string"
}));

var nodemailer = require("nodemailer");

app.use("/static", express.static(__dirname + "/static"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

// app.use(express.json());
// const expressFormidable = require("express-formidable");
// app.use(expressFormidable());

const mainURL = "http://localhost:4000";

const jwt = require("jsonwebtoken");
const accessSecret = "myAccessTokenSecret1234567890";

var MongoClient = require("mongodb").MongoClient;
MongoClient.connect("mongodb+srv://admin001:iluvc0ding@cluster0.ntkme.mongodb.net/mongodb-blog-final?retryWrites=true&w=majority", {useNewUrlParser: true}, function (error, client) {
    var blog = client.db("node-blog");
    console.log("DB connected");

    app.post("/do-delete", function (req, res) {
        if (req.session.admin) {
            
            fs.unlink(req.body.image.replace("/", ""), function (error) {

                blog.collection("posts").remove({
                    "_id": ObjectId(req.body._id)
                }, function (error, document) {
                    res.send("Deleted");
                });

            });

        } else {
            res.redirect("/admin");
        }
    });

    app.get("/get-posts/:start/:limit", function (req, res) {
        
        blog.collection("posts").find().sort({
            "_id": -1
        }).skip(parseInt(req.params.start)).limit(parseInt(req.params.limit)).toArray(function (error, posts) {
            res.send(posts);
        });

    });

    app.post("/getUser", function (request, result) {
        var accessToken = request.body.accessToken;
        blog.collection("users").findOne({
            "accessToken": accessToken
        }, function (error, user) {
            if (user == null) {
                result.json({
                    "status": "error",
                    "message": "User has been logged out. Please login again."
                });
            } else {
                result.json({
                    "status": "success",
                    "message": "Record has been fetched.",
                    "data": user
                });
            }
        });
    });

    app.get("/addPost", function (request, result) {
        result.render("user/addPost");
    });

    app.post("/addPost", function (request, result) {
        var name = request.body.name;
        var email = request.body.email;
        var password = request.body.password;
        var reset_token = "";
        var isVerified = false;
        var verification_token = new Date().getTime();

        blog.collection("users").findOne({
            "email": email
        }, function (error, user) {
            if (user == null) {

                bcryptjs.genSalt(10, function (error, salt) {
                    bcryptjs.hash(password, salt, function (error, hash) {
                        blog.collection("users").insertOne({
                            "name": name,
                            "email": email,
                            "password": hash,
                            "reset_token": reset_token,
                            "isVerified": isVerified,
                            "verification_token": verification_token
                        }, function (error, data) {

                            /*var transporter = nodemailer.createTransport(nodemailerObject);

                            var text = "Please verify your account by click the following link: " + mainURL + "/verifyEmail/" + email + "/" + verification_token;
                            var html = "Please verify your account by click the following link: <br><br> <a href='" + mainURL + "/verifyEmail/" + email + "/" + verification_token + "'>Confirm Email</a> <br><br> Thank you.";

                            transporter.sendMail({
                                from: nodemailerFrom,
                                to: email,
                                subject: "Email Verification",
                                text: text,
                                html: html
                            }, function (error, info) {
                                if (error) {
                                    console.error(error);
                                } else {
                                    console.log("Email sent: " + info.response);
                                }*/
                                
                                result.json({
                                    "status": "success",
                                    // "message": "Signed up successfully. An email has been sent to verify your account. Once verified, you will be able to login and start using social network."
                                    "message": "Signed up successfully. Please login now."
                                });

                            // });
                            
                        });
                    });
                });

            } else {
                result.json({
                    "status": "error",
                    "message": "Email or username already exist."
                });
            }
        });
    });

    app.post("/do-post", function (request, res) {

        var title = request.body.title;
        var content = request.body.content;
        var image = request.body.image;
        const categories = JSON.parse(request.body.categories);

        if (request.session.admin) {
            blog.collection("posts").insertOne({
                "title": title,
                "content": content,
                "image": image,
                "categories": categories,
                "user": {
                    "_id": request.session.admin._id,
                    "name": request.session.admin.email
                }
            }, function (error, document) {
                res.send({
                    "status": "success",
                    "message": "Posted successfully.",
                    _id: document.insertedId
                });
            });

        } else {
            res.send({
                "status": "error",
                "message": "Admin has been logged out. Please login again."
            });
        }
    });

    app.post("/add-post", function (request, result) {
        var title = request.body.title;
        var content = request.body.content;
        var image = request.body.image;
        var accessToken = request.body.accessToken;
        const categories = JSON.parse(request.body.categories);

        blog.collection("users").findOne({
            "accessToken": accessToken
        }, function (error, user) {
            if (user == null) {
                result.json({
                    "status": "error",
                    "message": "User has been logged out. Please login again."
                });
            } else {
                blog.collection("posts").insertOne({
                    "title": title,
                    "content": content,
                    "image": image,
                    "categories": categories,
                    "user": {
                        "_id": user._id,
                        "name": user.name
                    }
                }, function (error, document) {
                    result.json({
                        "status": "success",
                        "message": "Posted successfully.",
                        "_id": document.insertedId
                    });
                });
            }
        });

    });

    app.get("/signup", function (request, result) {
        result.render("user/signup");
    });

    app.post("/signup", function (request, result) {
        var name = request.body.name;
        var email = request.body.email;
        var password = request.body.password;
        var reset_token = "";
        var isVerified = false;
        var verification_token = new Date().getTime();

        blog.collection("users").findOne({
            "email": email
        }, function (error, user) {
            if (user == null) {

                bcryptjs.genSalt(10, function (error, salt) {
                    bcryptjs.hash(password, salt, function (error, hash) {
                        blog.collection("users").insertOne({
                            "name": name,
                            "email": email,
                            "password": hash,
                            "reset_token": reset_token,
                            "isVerified": isVerified,
                            "verification_token": verification_token
                        }, function (error, data) {

                            /*var transporter = nodemailer.createTransport(nodemailerObject);

                            var text = "Please verify your account by click the following link: " + mainURL + "/verifyEmail/" + email + "/" + verification_token;
                            var html = "Please verify your account by click the following link: <br><br> <a href='" + mainURL + "/verifyEmail/" + email + "/" + verification_token + "'>Confirm Email</a> <br><br> Thank you.";

                            transporter.sendMail({
                                from: nodemailerFrom,
                                to: email,
                                subject: "Email Verification",
                                text: text,
                                html: html
                            }, function (error, info) {
                                if (error) {
                                    console.error(error);
                                } else {
                                    console.log("Email sent: " + info.response);
                                }*/
                                
                                result.json({
                                    "status": "success",
                                    // "message": "Signed up successfully. An email has been sent to verify your account. Once verified, you will be able to login and start using social network."
                                    "message": "Signed up successfully. Please login now."
                                });

                            // });
                            
                        });
                    });
                });

            } else {
                result.json({
                    "status": "error",
                    "message": "Email or username already exist."
                });
            }
        });
    });

    app.get("/login", function (request, result) {
        result.render("user/login");
    });

    app.post("/login", function (request, result) {
        var email = request.body.email;
        var password = request.body.password;
        blog.collection("users").findOne({
            "email": email
        }, function (error, user) {
            if (user == null) {
                result.json({
                    "status": "error",
                    "message": "Email does not exist"
                });
            } else {
                bcryptjs.compare(password, user.password, function (error, isVerify) {
                    if (isVerify) {

                        if (user.isVerified || true) {
                            var accessToken = jwt.sign({ email: email }, accessSecret);
                            blog.collection("users").findOneAndUpdate({
                                "email": email
                            }, {
                                $set: {
                                    "accessToken": accessToken
                                }
                            }, function (error, data) {
                                result.json({
                                    "status": "success",
                                    "message": "Login successfully",
                                    "accessToken": accessToken
                                });
                            });
                        }  else {
                            result.json({
                                "status": "error",
                                "message": "Kindly verify your email."
                            });
                        }
                        
                    } else {
                        result.json({
                            "status": "error",
                            "message": "Password is not correct"
                        });
                    }
                });
            }
        });
    });

    app.get("/logout", function (request, result) {
        result.redirect("/login");
    });
    
    app.get("/", function (req, res) {

        blog.collection("settings").findOne({}, function (error, settings) {

            if (settings == null) {
                var postLimit = 10;
            } else {
                var postLimit = parseInt(settings.post_limit);
            }

            blog.collection("posts").find().sort({"_id": -1}).limit(postLimit).toArray(function (error, posts) {

                for (var a = 0; a < posts.length; a++) {
                    if (posts[a].content.length > 100){
                        posts[a].content = posts[a].content.substring(0, 100) + '...';
                    }
                } 

                res.render("user/home", {
                    posts: posts,
                    "postLimit": postLimit
                });

            });
        });
    });

    app.get("/do-logout", function (req, res) {
        req.session.destroy();
        res.redirect("/admin");
    });

    app.get("/posts/edit/:id", function (req, res) {
        if (req.session.admin) {
            
            blog.collection("posts").findOne({
                "_id": ObjectId(req.params.id)
            }, function (error, post) {
                res.render("admin/edit_post", { "post": post });
            });

        } else {
            res.redirect("/admin");
        }
    });

    app.post("/do-edit-post", function (req, res) {
        blog.collection("posts").updateOne({
            "_id": ObjectId(req.body._id)
        }, {
            $set: {
                "title": req.body.title,
                "content": req.body.content,
                "image": req.body.image
            }
        }, function (error, post) {
            res.send("Updated successfully");
        });
    });

    app.get("/posts/:title", function (req, res) {
        blog.collection("posts").findOne({
            "title": req.params.title
        }, async function (error, post) {

            if (post == null) {
                res.render("user/404", {
                    "message": "Post not found"
                });
                return;
            }

            const relatedPosts = await blog.collection("posts").find({
                $and: [{
                    "_id": {
                        $ne: post._id
                    }
                }, {
                    "categories": {
                        $in: post.categories
                    }
                }]
            }).toArray();

            res.render("user/post", {
                post: post,
                "relatedPosts": relatedPosts
            });
        });
    });

    app.post("/do-reply", function (req, res) {
        var reply_id = ObjectId();

        blog.collection("posts").updateOne({
            "_id": ObjectId(req.body.post_id),
            "comments._id": ObjectId(req.body.comment_id)
        }, {
            $push: {
                "comments.$.replies": {
                    _id: reply_id,
                    name: req.body.name,
                    reply: req.body.reply
                }
            }
        }, function (error, document) {
            var transporter = nodemailer.createTransport({
                "service": "gmail",
                "auth": {
                    "user": "",
                    "pass": ""
                }
            });

            var mailOptions = {
                "from": "My Blog",
                "to": req.body.comment_email,
                "subject": "New reply",
                "text": req.body.name + " has replied on your comment. http://localhost:3000/posts/" + req.body.post_id
            };

            transporter.sendMail(mailOptions, function (error, info) {
                res.send({
                    text: "Replied",
                    _id: reply_id
                });
            });
        });
    });

    app.post("/do-comment", function (req, res) {
        var comment_id = ObjectId();

        blog.collection("posts").update({ "_id": ObjectId(req.body.post_id) }, {
            $push: {
                "comments": {
                    _id: comment_id,
                    username: req.body.username,
                    comment: req.body.comment,
                    email: req.body.email
                }
            }
        }, function (error, post) {
            res.send({
                text: "comment successfull",
                _id: post.insertedId
            });
        });
    });

    app.post("/do-upload-image", function (req, res) {
        var formData = new formidable.IncomingForm();
        formData.parse(req, function (error, fields, files) {
            var oldPath = files.file.path;
            var newPath = "static/images/" + files.file.name;
            
            fs.rename(oldPath, newPath, function (err) {
                res.send("/" + newPath);
            });
        });
    });

    app.post("/do-update-image", function (req, res) {
        var formData = new formidable.IncomingForm();
        formData.parse(req, function (error, fields, files) {

            fs.unlink(fields.image.replace("/", ""), function (error) {
                var oldPath = files.file.path;
                var newPath = "static/images/" + files.file.name;
                
                fs.rename(oldPath, newPath, function (err) {
                    res.send("/" + newPath);
                });
            });
        });
    });

    io.on("connection", function (socket) {
        // console.log(socket.id + " User connected");

        socket.on("new_post", function (formData) {
            if (formData.content.length > 200){
                formData.content = formData.content.substring(0, 200) + '...';
            }
            socket.broadcast.emit("new_post", formData);
        });

        socket.on("edit_post", function (formData) {
            if (formData.content.length > 200){
                formData.content = formData.content.substring(0, 200) + '...';
            }
            socket.broadcast.emit("edit_post", formData);
        });

        socket.on("new_comment", function (comment) {
            io.emit("new_comment", comment);
        });

        socket.on("new_reply", function (reply) {
            io.emit("new_reply", reply);
        });

        socket.on("delete_post", function (replyId) {
            socket.broadcast.emit("delete_post", replyId);
        });
    });

    http.listen(4000, function () {
        console.log("Server started at: " + mainURL);
    });
});