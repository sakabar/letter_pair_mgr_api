require('dotenv').config();
const path = require('path');
const Sequelize = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',

        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },

        // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
        operatorsAliases: false,
    }
);

const User = sequelize.import(path.join(__dirname, '/lib/tables/user'));
const LettersToWord = sequelize.import(path.join(__dirname, '/lib/tables/letterPair'));

sequelize.sync().then(() => {
    const app = express();
    app.use(bodyParser.urlencoded({
        extended: true,
    }));

    app.use(bodyParser.json());

    // GET
    // /letterPair/:userName?word=試験
    // /letterPair/userName?letters=しけ
    app.get('/letterPair/:userName', (req, res, next) => {
        const userName = req.params.userName;
        const word = req.query.word;
        const letters = req.query.letters;

        let query;
        if (word) {
            query = {
                where: {
                    userName,
                    word,
                },
            };
        } else if (letters) {
            query = {
                where: {
                    userName,
                    letters,
                },
            };
        } else {
            query = { where: { userName, }, };
        }

        LettersToWord.findAll(query).then((result) => {
            res.json({
                code: 200,
                result,
            });
            res.status(200);
        }, () => {
            res.status(400).send(badRequestError);
        });
    });

    const badRequestError = {
        error: {
            message: 'Bad Request',
            code: 400,
        },
    };

    // POST
    app.post('/letterPair/:userName', (req, res, next) => {
        const userName = req.params.userName;
        const word = req.body.word;
        const letters = req.body.letters;

        if (!word || !letters) {
            res.status(400).send(badRequestError);
        }

        LettersToWord.create({
            userName,
            word,
            letters,
        }).then((lw) => {
            const ans = {
                success: {
                    code: 200,
                    result: lw,
                },
            };
            res.json(ans);
            res.status(200);
        }, () => {
            res.status(400).send(badRequestError);
        });
    });

    app.get('/users/:userName', (req, res, next) => {
        const userName = req.params.userName;

        User.findOne({
            where: {
                userName,
            },
        }).then((result) => {
            let masked_res = result;
            if (masked_res){
                masked_res.password = '********';
            }
            res.json({
                code: 200,
                result: masked_res,
            });
            res.status(200);
        }, () => {
            res.status(400).send(badRequestError);
        });
    });

    app.post('/users', (req, res, next) => {
        const userName = req.body.userName;
        const password = req.body.password;

        User.create({
            userName,
            password,
        }).then((user) => {
            const ans = {
                success: {
                    code: 200,
                    result: user,
                },
            };
            res.json(ans);
            res.status(200);
        }, () => {
            res.status(400).send(badRequestError);
        });
    });

    app.listen(3000);
});
