const GoogleSpreadsheet = require('google-spreadsheet');
const async = require('async');

// spreadsheet key is the long id in the sheets URL
const doc = new GoogleSpreadsheet('Your-Google-Sheet-ID');

function getFormEntries(cb) {
    // cb will be called with like cb(err, entries[])
    try {
        let sheet;
        async.series([
            function getInfoAndWorksheets(step) {
                doc.getInfo(function (err, info) {
                    if (err) return cb(err);
                    sheet = info.worksheets[0];
                    step();
                });
            },
            function workingWithRows(step) {
                // google provides some query options
                sheet.getRows({
                    offset: 1,
                    limit: 2000,
                }, function (err, rows) {
                    let formEntries = [];
                    rows.forEach(row => {
                        formEntries.push(row);
                    });
                    cb(null, formEntries);
                    step();
                });
            },
        ], function (err) {
            if (err) {
                cb(err);
                // console.log('Error: ' + err);
            }
        });
    } catch (err) {
        cb(err)
    }
}

module.exports = {
    'getFormEntries': getFormEntries,
}