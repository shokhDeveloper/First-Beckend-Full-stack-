import os from "node:os";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createToken } from "./create-token.js";
let IP_ADRESS = "";
const PORT = 3000;
try {
  const networkInterface = os.networkInterfaces();
  if (networkInterface) {
    IP_ADRESS = networkInterface["Беспроводная сеть 3"].find(
      (item) => item.family == "IPv4"
    ).address;
  }
} catch (error) {
  throw new Error("Wi-Fi Error IP adress");
}
IP_ADRESS = "127.0.0.2";
let BASE_SERVER_URL = `http://${IP_ADRESS}:${PORT}`;
const getData = async (type) => {
  let data = await fs.readFile(path.join("database", `${type}.json`));
  data = data ? JSON.parse(data) : [];
  return data;
};
const server = http.createServer(async (req, res) => {
  if (req.method == "GET" && req.url == "/") {
    res.setHeader("Content-Type", "text/html");
    res.end(await fs.readFile(path.join("frontend", "index.html")));
  } else if (req.method == "GET" && req.url == "/login") {
    res.setHeader("Content-Type", "text/html");
    res.end(await fs.readFile(path.join("frontend", "login", "index.html")));
  } else if (req.method == "GET" && req.url == "/register") {
    res.setHeader("Content-Type", "text/html");
    res.end(await fs.readFile(path.join("frontend", "register", "index.html")));
  } else if (req.method === "POST" && req.url === "/register") {
    res.setHeader("Content-Type", "application/json");
    let user = "";
    req.on("data", (buffer) => {
      user += buffer;
    });
    req.on("end", async () => {
      let newUser = JSON.parse(user);
      if (
        newUser.email &&
        newUser.username &&
        newUser.firstName &&
        newUser.password
      ) {
        const users = await getData("users");
        if (users.length) {
          if (!users.some((item) => item.email == newUser.email)) {
            req.statusCode = 201;
            res.statusCode = 201;
            newUser = {        ...newUser,
              id: users[users.length - 1].id + 1,
              date: new Date().toLocaleDateString()}
              users.push(newUser)
              await fs.writeFile(path.join("database", "users.json"), JSON.stringify(users, null, 4))
              res.end(
              JSON.stringify({
                accessToken: createToken(),
                user: newUser,
              })
            );
          } else {
            req.statusCode = 409;
            res.statusCode = 409;
            res.end(
              JSON.stringify({
                message: "Register error",
                type: "Its email already exits",
              })
            );
          }
        } else {
          req.statusCode = 201;
          res.statusCode = 201;
          users.push({
            ...newUser,
            id: 1,
            date: new Date().toLocaleDateString(),
          });
          await fs.writeFile(
            path.join("database", "users.json"),
            JSON.stringify(users, null, 4)
          );
          res.end(
            JSON.stringify({
              accessToken: createToken(),
              user: newUser,
            })
          );
        }
      }
    });
  } else if (req.method == "POST" && req.url == "/login") {
    res.setHeader("Content-Type", "application/json");
    let user = "";
    req.on("data", (buffer) => {
      user += buffer;
    });
    req.on("end", async () => {
      user = JSON.parse(user);
      const users = await getData("users");

      if (users.length) {
        if (
          users.some(
            (item) => item.email == user.email && item.password == user.password
          )
        ) {
          user = users.find((item) => item.email == user.email);
          req.statusCode = 200;
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              accessToken: createToken(),
              user,
            })
          );
        } else {
          res.statusCode = 400;
          req.statusCode = 400;
          res.end(
            JSON.stringify({
              message: "Bad Request",
            })
          );
        }
      } else {
        req.statusCode = 404;
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            message: "User not found",
          })
        );
      }
    });
  } else if (req.method == "GET" && req.url == "/users") {
    res.setHeader("Content-Type", "text/html");
    res.end(await fs.readFile(path.join("frontend", "users", "index.html")));
  } else if (req.method == "GET" && req.url == "/api/users") {
    const users = await getData("users");
    res.end(JSON.stringify(users, null, 4));
  } else if (req.method == "GET" && req.url == "/posts") {
    res.setHeader("Content-Type", "text/html");
    res.end(await fs.readFile(path.join("frontend", "posts", "index.html")));
  } else if (req.method == "GET" && req.url == "/api/posts") {
    const posts = await getData("posts");
    res.end(JSON.stringify(posts, null, 4));
  } else if (req.method == "GET" && req.url == "/create-post") {
    res.setHeader("Content-Type", "text/html");
    res.end(
      await fs.readFile(path.join("frontend", "createPost", "index.html"))
    );
  } else if (req.method == "POST" && req.url == "/create-post") {
    let post = "";
    req.on("data", (buffer) => {
      post += buffer;
    });
    req.on("end", async () => {
      post = JSON.parse(post);
      if (post.title && post.discription && post.author) {
        const posts = await getData("posts");
        posts?.push({
          ...post,
          user_id: post.author.id,
          post_id: posts?.length ? posts[posts.length - 1].post_id + 1 : 1,
        });
        await fs.writeFile(
          path.join("database", "posts.json"),
          JSON.stringify(posts, null, 4)
        );
        res.end(
          JSON.stringify({
            message: "Post created successfull",
            post,
          })
        );
      } else {
        req.statusCode = 400;
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            message: "post title, post discription, post author required",
          })
        );
      }
    });
  } else if (req.method == "GET" && req.url.startsWith("/data/post/")) {
    res.setHeader("Content-Type", "text/html");
    res.end(await fs.readFile(path.join("frontend", "dataPost", "index.html")));
  } else if (req.method == "GET" && req.url.startsWith("/api/post/")) {
    res.setHeader("Content-Type", "application/json");
    const id = req.url.split("/").pop();
    if (id) {
      const posts = await getData("posts");
      const findPost = posts?.find((item) => item.post_id == id);
      res.end(JSON.stringify(findPost));
    } else {
      res.end("Not found");
    }
  } else if((req.method == "PUT" || req.method == "PATCH") && req.url.startsWith("/api/update/post/")){
    res.setHeader("Content-type", "application/json")
    let posts = await getData("posts")
    let post = ''
    let id = req.url.split("/").pop();
    let postIndex = posts?.findIndex((item) => item.post_id == id)
    req.on("data", (buffer) => {
      post += buffer;
    })
    req.on("end", async () => {
      post = JSON.parse(post)
      if(post.title && post.discription && post.author){
        posts[postIndex] = {...posts[postIndex], ...post, post_id: posts[postIndex].post_id, user_id: posts[postIndex].author.id}
        await fs.writeFile(path.join("database", "posts.json"), JSON.stringify(posts, null, 4))
        res.end(JSON.stringify({
          message: "Updated post successfull",
          post
        }))
      }else{
        res.end(JSON.stringify({
          message: "Post is invalid !"
        }))
      }
    })
  }else if(req.method == "GET" && req.url.startsWith("/user/posts/") ){
    res.setHeader("Content-Type", "text/html")
    res.end(await fs.readFile(path.join("frontend", "userPosts", "index.html")))
  }else if(req.method == "GET" && req.url.startsWith("/user/api/posts/")){
    res.setHeader("Content-type", "application/json")
    const id = req.url.split("/").pop()
    const posts = await getData("posts")
    const userPosts = posts.filter((item) => item.user_id == id)
    if(userPosts.length){
      res.end(JSON.stringify(userPosts) )
    }else{
      res.end(JSON.stringify([]))
    }
  }else if(req.method == "GET" && req.url == "/account"){
    res.setHeader("Content-Type", "text/html")
    res.end(await fs.readFile(path.join("frontend", "account", "index.html")))
  }else if(req.method == "GET" && req.url.startsWith(`/account/`)){
    res.setHeader("Content-type", "application/json")
    let id = req.url.split("/").pop()
    let users = await getData("users")
    let profileData = users.find((item) => item.id == id)
    res.end(JSON.stringify(profileData))
  }else if(req.method == "PUT" || req.method == "PATCH" && req.url.startsWith("/account/") ){
    let newUser = ''
    const id = req.url.split("/").pop()
    let users = await getData("users")
    let userIdx = users.findIndex((item) => item.id == id)
    req.on("data", (buffer) => {
      newUser += buffer
    })
    req.on("end", async () => {
      newUser = JSON.parse(newUser)
      if(newUser.email &&
        newUser.username &&
        newUser.firstName &&
        newUser.password){
          users[userIdx] = {...users[userIdx], ...newUser}
          await fs.writeFile(path.join("database", "users.json"), JSON.stringify(users, null, 4))
          res.end(JSON.stringify({
            message: "Updated profile data",
            newUser
          }))
        }
    })
  }
  else {
    res.end("Not found leo");
  }
});
server.listen(PORT, () => {
  console.log(`Server is running on ${BASE_SERVER_URL}`);
});