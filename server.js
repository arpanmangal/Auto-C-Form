const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fillCForm = require('./fillCForm');
const zipdir = require('zip-dir');
const del = require('del');

const app = express();
const PORT = process.env.PORT || 4000;

const FileName = 'FilledcForm.pdf';
const password = process.env.PASS || 'Your-Not-So-Secret-Password';
let numberOfPDFs = 0;

app.use('/forms', express.static('forms'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb'
}));

app.get('/', function (req, res) {
    res.render('index');
});

app.post('/login', function (req, res) {
    // Simple password check only
    if (!req.body || !req.body.password || req.body.password !== password) {
        return res.render('trespassing');
    }

    let links = []
    for (let i = 1; i <= numberOfPDFs; i++) {
        links.push({
            label: ('Form ' + i),
            href: ('/forms/' + i + '.pdf')
        });
    }

    res.render('main', {
        links: links
    });
});

app.get('/download', function (req, res) {
    zipdir(path.join(__dirname, 'forms/'), { saveTo: path.join(__dirname, 'forms.zip') }, function (err, buffer) {
        if (err) {
            return res.send('Sorry, the zip file could not be generated');
        }
        res.sendFile(path.join(__dirname, 'forms.zip'));
    });
});

app.post('/refresh', function (req, res) {
    // Delete all older files first
    del(['forms/*.pdf'])
        .then(paths => {
            numberOfPDFs = 0;
            fillCForm.generateAllForms()
                .then(numPDFs => {
                    numberOfPDFs = numPDFs;
                    res.status(200).send('Updated the forms');
                })
                .catch(err => {
                    res.status(500).send('some error occurred');
                    console.error(err);
                })
        });
});

app.listen(PORT, function (err) {
    if (err) {
        console.error(err);
    } else {
        console.log('App running successfully on ' + PORT);
    }
});