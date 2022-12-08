const express = require("express");
const app = express();
const PORT = process.env.PORT || 6000;

const http = require("http").Server(app);
const cors = require("cors");
const { CONNREFUSED } = require("dns");

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "http://127.0.0.1:5173",
  },
});

const dataBase = [];
const generateID = () => Math.random().toString(36).substring(2, 10);

socketIO.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  
  socket.on("login", (data) => {
    const { username, password } = data;

    let result = dataBase.filter(
      (user) => user.username === username && user.password === password
    );
    if (result.length !== 1) {
      return socket.emit("loginError", "Incorrect credentials");
    }
 
    socket.emit("loginSuccess", {
      message: "Login successfully",
      data: {
        _id: result[0].id,
        _email: result[0].email,
      },
    });
  });

  socket.on("register", (data) => {
    const { username, email, password } = data;
  
    let result = dataBase.filter((user) => {
      user.username == username || user.email == email;
    });

    if (result.length === 0) {
      dataBase.push({
        id: generateID(),
        username: username,
        password: password,
        email: email,
        images: [],
      });
      return socket.emit("registerSuccess", "Account created successfully!");
    }

    socket.emit("registerError", "User Already Exist");
  });

  socket.on("allPhotos", (data) => {
    let images = [];

    for (let i = 0; i < dataBase.length; i++) {
      images = images.concat(dataBase[i]?.images);
    }
    socket.emit("allPhotosMessage", {
      message: "Photos Fetched successfully",
      photos: images,
    });
  });

  socket.on("getMyPhotos", (id) => {
    let result = dataBase.filter((user) => user.id === id);
   
    socket.emit("getMyPhotosMessage", {
      data: result[0]?.images,
      username: result[0]?.username,
    });
  });
  socket.on("photoUpVote", (data) => {
    const { userId, photoId } = data;
    let images = [];


    for (let i = 0; i < dataBase.length; i++) {
      //👇🏻 ensures that only other users' images are separated into the images array
      if (!(dataBase[i].id === userId)) {
          images = images.concat(dataBase[i]?.images);
      }
  }

    const item = images.filter((img) => img.id == photoId);
  

    if (item.length < 1) {
      return socket.emit("upvoteError", {
          error_message: "You cannot upvote your photos",
      });
  }

  const voters = item[0]?.votedUsers;
  //👇🏻 Checks if the user has not upvoted the image before
  const authenticateUpvote = voters.filter((voter) => voter === userId);
  if (!authenticateUpvote.length) {
      item[0].vote_count += 1;
      voters.push(userId);
      socket.emit("allPhotosMessage", {
          message: "Photos retrieved successfully",
          photos: images,
      });

      return socket.emit("upvoteSuccess", {
          message: "Upvote successful",
          item,
      });
  }
 
  socket.emit("upvoteError", {
      error_message: "Duplicate votes are not allowed",
  });

  });

  socket.on("sharePhoto", (name) => {
    let result = dataBase.filter((user) => user.username === name);
    socket.emit("sharePhotoMessage", result[0]?.images);
  });
  socket.on("uploadPhoto", (data) => {
    const { email, id, photoURL } = data;

    let result = dataBase.filter((user) => user.id === id);
    const newImage = {
      id: generateID(),
      image_Url: photoURL,
      vote_count: 0,
      votedUsers: [],
      _ref: email,
    };
   
    result[0]?.images.unshift(newImage);
    
    socket.emit("uploadPhotoMessage", "Uploaded successfully");
  });

  socket.on("disconnect", () => {
    socket.disconnect();
    console.log("🔥: A user disconnected");
  });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get("/api", (req, res) => {
  res.json({
    message: "Hello world",
  });
});

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
