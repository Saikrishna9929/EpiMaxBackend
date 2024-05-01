const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

let database = require("./database");

const databasePath = path.join(__dirname, "myDatabase.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () =>
      console.log("Server Running at http://localhost:3001/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    title: dbObject.title,
    description: dbObject.description,
    status: dbObject.status,
    assigneeId: dbObject.assignee_id,
    createdAt: dbObject.created_at,
    updatedAt: dbObject.updated_at,
  };
};

const authentication = (request, response, next) => {
  let jwtToken;
  let authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
     SELECT * FROM Users WHERE username = "${username}" ;`;
  const user = await db.get(getUserQuery);

  if (user === undefined) {
    if (password.length >= 6) {
      let hashPassword = await bcrypt.hash(password, 10);

      const addUserQuery = `
           INSERT INTO Users(username, password_hash)
           VALUES
                ("${username}", "${hashPassword}") ; `;
      await db.run(addUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM Users 
    WHERE username = "${username}" ;`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let isPasswordMatch = await bcrypt.compare(password, dbUser.password_hash);
    if (isPasswordMatch === true) {
      let payload = {
        username: username,
      };
      let jwtToken = await jwt.sign(payload, "MY_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/tasks/", authentication, async (request, response) => {
  const getTasksQuery = `
    SELECT
      *
    FROM
      Tasks;`;
  const tasksArray = await db.all(getTasksQuery);
  response.send(
    tasksArray.map((eachTask) => convertDbObjectToResponseObject(eachTask))
  );
});

app.get("/tasks/:id/", authentication, async (request, response) => {
  const { id } = request.params;
  const getTaskQuery = `
    SELECT 
      * 
    FROM 
      Tasks 
    WHERE 
      id = ${id};`;
  const task = await db.get(getTaskQuery);
  response.send(convertDbObjectToResponseObject(task));
});

app.post("/tasks/", authentication, async (request, response) => {
  const {
    id,
    title,
    description,
    status,
    assigneeId,
    createdAt,
    updatedAt,
  } = request.body;
  const postTaskQuery = `
  INSERT INTO
    Tasks (id, title , description, status, assignee_id, created_at, updated_at)
  VALUES
    ('${id}', "${title}", '${description}','${status}', ${assigneeId},"${createdAt}",
     "${updatedAt}");`;

  const task = await db.run(postTaskQuery);
  response.send("Task Added to Team");
});

app.put("/tasks/:id/", authentication, async (request, response) => {
  const requestBody = request.body;
  let updateColumn = "";

  switch (true) {
    case requestBody.title !== undefined:
      updateColumn = "Title";
      break;
    case requestBody.description !== undefined:
      updateColumn = "Description";
      break;
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.assigneeId !== undefined:
      updateColumn = "Assignee Id";
      break;
    case requestBody.createdAt !== undefined:
      updateColumn = "CreatedAt Date";
      break;
    case requestBody.updatedAt !== undefined:
      updateColumn = "UpdatedAt Date";
      break;
  }

  const { id } = request.params;
  const getTaskQuery = `select * from Tasks where id = ${id};`;
  let previousTask = await db.get(getTaskQuery);

  let {
    title = previousTask.title,
    description = previousTask.description,
    status = previousTask.status,
    assigneeId = previousTask.assignee_id,
    createdAt = previousTask.created_at,
    updatedAt = previousTask.updated_at,
  } = request.body;

  const updateTaskQuery = `
  UPDATE
    Tasks
  SET
    title = '${title}',
    description = '${description}', 
    status = '${status}', 
    assignee_id = ${assigneeId}, 
    created_at = "${createdAt}",
    updated_at = "${updatedAt}"
  WHERE
    id = ${id};`;

  await db.run(updateTaskQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/tasks/:id/", authentication, async (request, response) => {
  const { id } = request.params;
  const deleteTaskQuery = `
  DELETE FROM
    Tasks
  WHERE
    id = ${id};`;
  await db.run(deleteTaskQuery);
  response.send("Task Removed");
});

module.exports = app;
