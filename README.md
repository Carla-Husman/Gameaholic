
# GAMEAHOLIC - Web Development college project (Node.js) <img src="https://github.com/Carla-Husman/Gameaholic/assets/125916556/f4d9f9bd-11dd-42b8-b950-41a526d4aac9" width="40" height="30">


This repository contains the source code for Gameaholic, a web application that allows users to purchase video games online. The application is built using Node.js as the server, Express framework and MongoDB as the database.

## Technologies 

- Node.js (v18.16.0)
- Express.js (v4.x)
- MongoDB

## Features

- **User Authentication**: Users can log in to the website. Unauthenticated users can still browse the site and view the available products fetched from the MongoDB database. The user authentication system utilizes _sessions_ and _cookies_ to manage user sessions securely.
- **Product Listing**: Users can browse through the list of available games on the website, view detailed information about each game, and add them to their shopping cart.
- **Shopping Cart**: Authenticated users have the ability to add games to their shopping cart, review the order summary, and view the total price before proceeding to checkout.
- **User Roles**: The website supports two types of users: _regular users_ and _administrators_. Administrators have additional privileges, such as the ability to add new products to the database.
- **Security Measures**: Several security measures have been implemented to enhance the security of the website:
     - **Account Lockout**: If a user exceeds the maximum number of failed login attempts within a specific time interval, their account will be temporarily blocked.
    - **Route Protection**: If a user tries to access a non-existent route, they will be temporarily banned from accessing any resources on the site.
    - **Input Validation**: Measures have been taken to prevent injection attacks, and input validation has been implemented to ensure data integrity and security when interacting with the database.
- **Asynchronous Database Management**: The application utilizes asynchronous programming techniques to manage database operations using MongoDB. This ensures efficient and responsive handling of data interactions without blocking the server's event loop.
- **Game Questionnaire**: The website includes a game questionnaire where users can answer questions related to video games. At the end of the questionnaire, the user is presented with their final score. The questionnaire enhances user engagement and provides a fun interactive experience for users.

## Setup

These are the steps for installing the necessary packages and running the application:

```
$ npm init
$ npm install
$ npm install -g nodemon
$ npm install express --save
$ npm install ejs --save
$ npm install express-ejs-layouts --save
$ npm install body-parser --save
$ npm install cookie-parser --save
$ npm install express-session --save
$ npm install mongodb
$ nodemon app.js
```
Go to [main page](http://localhost:6789/).

## Screenshots
### Main page
![image](https://github.com/Carla-Husman/Gameaholic/assets/125916556/874f174f-3e42-49ab-bb73-92ee1fcad70d)

### Log in page
![image](https://github.com/Carla-Husman/Gameaholic/assets/125916556/4b36242e-4ec8-4a4e-9fcc-b248b8862c5f)

### Questionnaire page
![image](https://github.com/Carla-Husman/Gameaholic/assets/125916556/57ab02c6-cd05-4f91-b83c-1fc32813e3e4)

### Shopping cart page
![image](https://github.com/Carla-Husman/Gameaholic/assets/125916556/1c16b597-e349-4244-920b-6bb87975bde7)

### Admin page
![image](https://github.com/Carla-Husman/Gameaholic/assets/125916556/adc51cd3-06cf-459e-bbd8-deb5c9ee9b28)

