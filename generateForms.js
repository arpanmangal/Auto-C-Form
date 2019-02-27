const pdfFillForm = require('pdf-fill-form');
const fs = require('fs');
const converter = require('number-to-words');
const download = require('download');

/** Populates the CForm and returns file name */
function generateCForm(info, suppInfo, idx) {
    return new Promise(function (resolve, reject) {
        try {
            let data = [
                'Sl NoRow1.',
                'Name Address of Supplier CMBill No  DateRow',
                'Description of itemsRow',
                'AmountRow1.0.',
                'DateRow1.',
                'Particulars of itemsRow1.',
                'DateRow1.',
                'RateRow1.',
                'QtyRow1.',
            ]

            let fields = {
                'SNo': (idx + 1),
                'Name of Official who drew Advance  Buyer': 'Dr. D Sundar',
                'Emp Code': '16215',
                'DepartmentSection': 'DBEB',
                'Budget Head': 'TRYST(Venue Project Expense)(County 2)',
                'Project Code': 'MI-00995',
                'Text3': 18,
                'Text4': 19,
                'Text5.0': 'Abhinav Arora',
                'Text5.1': '2015BB10021',
            }

            let totalAmt = 0;
            info.forEach((entry, i) => {
                let address = entry.suppAdd.split(" ");
                let addLine1 = address.slice(0, address.length / 2).join(' ');
                let addLine2 = address.slice(address.length / 2).join(' ');

                fields[data[0] + entry.offset] = entry.SNo;
                fields[data[1] + (1 + entry.offset)] = entry.suppName;
                fields[data[1] + (2 + entry.offset)] = 'Address: ' + addLine1;
                fields[data[1] + (3 + entry.offset)] = addLine2;
                fields[data[1] + (4 + entry.offset)] = 'Bill No.: ' + entry.billNo;
                fields[data[1] + (5 + entry.offset)] = 'Date: ' + entry.billDate;
                fields[data[6] + (i)] = entry.billDate;
                fields[data[2] + (1 + entry.offset)] = entry.itemDesc;
                fields[data[5] + (i)] = entry.itemDesc;

                fields[data[7] + entry.offset] = entry.rate;
                fields[data[8] + entry.offset] = entry.quan;
                fields[data[3] + entry.offset] = entry.amt;
                totalAmt += entry.amt;
            })

            fields['AmountTotal'] = totalAmt;
            fields['Passed for Rs'] = totalAmt + '/-';
            fields['Balance now payable Rs 1'] = totalAmt + '/-';
            let amtWords = (converter.toWords(parseInt(totalAmt)) + ' rupees' + ' only').toUpperCase();
            fields['in words'] = amtWords;
            fields['Name'] = suppInfo.name + ' | ' + suppInfo.code;
            // fields['Name'] = 'Abhinav Arora' + ' | ' + '203xxx';

            const IFile = 'cForm.pdf';
            const OFile = 'tmp/cform' + (idx + 1) + '.pdf';

            pdfFillForm.writeAsync(IFile,
                fields, { "save": "pdf" },
                function (err, pdf) {
                    if (err) return reject(err);

                    fs.writeFile(OFile, pdf, function (err) {
                        if (err) return reject(err);
                        return resolve(OFile);
                    });
                }
            );
        } catch (err) {
            return reject(err);
        }
    });
}

function generateOnlineForm(info, idx) {
    return new Promise(function (resolve, reject) {
        try {
            const IFile = 'onlinepayment.pdf';
            const OFile = 'tmp/online' + (idx + 1) + '.pdf';

            let fields = {
                'untitled1': info.itemDesc,
                'untitled2': info.rate,
                'untitled3': info.rateWords,
                'untitled4': info.quan,
                'untitled5': info.totalAmt,
            }

            pdfFillForm.writeAsync(IFile,
                fields, { "save": "pdf" },
                function (err, pdf) {
                    if (err) return reject(err);

                    fs.writeFile(OFile, pdf, function (err) {
                        if (err) return reject(err);
                        return resolve(OFile);
                    });
                });
        } catch (e) {
            return reject(e);
        }
    })
}

function generatePFCForm(info, idx) {
    return new Promise(function (resolve, reject) {
        try {
            const IFile = 'pfc.pdf';
            const OFile = 'tmp/pfc' + (idx + 1) + '.pdf';

            let fields = {
                'untitled1': info.itemDesc,
                'untitled2': info.rate,
                'untitled3': info.rateWords,
                'untitled4': info.quan,
                'untitled5': info.totalAmt,
            }

            pdfFillForm.writeAsync(IFile,
                fields, { "save": "pdf" },
                function (err, pdf) {
                    if (err) return reject(err);

                    fs.writeFile(OFile, pdf, function (err) {
                        if (err) return reject(err);
                        return resolve(OFile);
                    });
                });
        } catch (e) {
            return reject(e);
        }
    })
}

/** Downloads all the bills and stores in the tmp/bill<>.pdf */
function downloadBills(bills, idx) {
    return new Promise(function (resolve, reject) {
        let promises = [];
        bills.forEach((bill, i) => {
            const OFile = 'tmp/bill' + (idx + 1) + '-' + i + '.pdf';
            promises.push(downloadBill(bill, OFile));
        });

        Promise.all(promises)
            .then(result => {
                const filtered = result.filter(e => { return e != null });
                return resolve(filtered);
            })
            .catch(err => {
                return resolve([]);
            })
    });
}

function downloadBill(link, savePath) {
    return new Promise(function (resolve, reject) {
        try {
            const OFile = savePath;
            let idRegex = /id=(.*)/;
            let id = idRegex.exec(link)[1];
            link = 'https://drive.google.com/uc?export=view&id=' + id;

            download(link)
                .then(data => {
                    fs.writeFile(OFile, data, function (err) {
                        if (err) return reject(err);
                        return resolve(OFile);
                    });
                })
                .catch(err => {
                    return resolve(null);
                })

        } catch (e) {
            return resolve(null);
        }
    });
}

module.exports = {
    'generateCForm': generateCForm,
    'generateOnlineForm': generateOnlineForm,
    'generatePFCForm': generatePFCForm,
    'downloadBills': downloadBills,
}