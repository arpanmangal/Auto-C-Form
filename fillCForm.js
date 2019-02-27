const pdfFillForm = require('pdf-fill-form');
const fs = require('fs');
const googleSheets = require('./google-sheets');
const converter = require('number-to-words');
const download = require('download');
const PDFMerge = require('pdf-merge');
const generateForms = require('./generateForms');

/* Fetch the google sheets data, and generate corresponding forms */
function generateAllForms() {
    // returns promise with resolve(numPDFs) and reject(err)
    return new Promise(function (resolve, reject) {
        googleSheets.getFormEntries(function (err, entries) {
            if (err) {
                return cb(err);
            }

            let promises = [];
            entries.forEach((row, idx) => {
                promises.push(_genAllForms(row, idx));
            });

            Promise.all(promises)
                .then(result => {
                    return resolve(entries.length);
                })
                .catch(err => {
                    return reject(err);
                })
        });
    });
}

// Generate either of the 3 types of forms, append them, and append the bill
function _genAllForms(entry, idx) {
    return new Promise(function (resolve, reject) {
        let billType = entry.typeofbill;
        let promises = [];

        switch (billType) {
            case 'Reimbursement':
                promises.push(makeReimForm(entry, idx));
                break;
            case 'Direct payment to Vendor':
                promises.push(makeOnlineForm(entry, idx));
                break;
            default:
                promises.push(makePFCform(entry, idx));
                break;
        }

        // All forms parsed
        Promise.all(promises)
            .then(result => {
                // Forms gnerated successfully
                return resolve('success');
            })
            .catch(err => {
                reject(err);
            })
    });
}

function makeReimForm(entry, idx) {
    return new Promise(function (resolve, reject) {
        let reimInfo = getReimInfo(entry);
        let suppInfo = { name: 'Abhinav Arora', code: '32106549341' };
        let promises = [];

        promises.push(generateForms.generateCForm(reimInfo[0], suppInfo, idx));
        promises.push(generateForms.downloadBills(reimInfo[1], idx));

        Promise.all(promises)
            .then(result => {
                // Append the lists of bills behind the cform
                let pdfs = [result[0]];
                pdfs = pdfs.concat(result[1]);
                return appendForms(pdfs, idx);
            })
            .then(result => {
                // Forms generated successfully
                return resolve('success');
            })
            .catch(err => {
                reject(err);
            })
    });
}

/** Returns the info for the reimbursement form 3 bills */
function getReimInfo(entry) {
    let info = [];
    let bills = [];

    /** Bill 1 */
    let rate = parseFloat(entry.perunitpricereimbursement); if (isNaN(rate)) rate = 0;
    let quan = parseFloat(entry.quantityofitemreimbursement); if (isNaN(quan)) quan = 0;
    let amt = rate * quan;
    bills.push(entry.billpleaseuploadscannedbillherereimbursement);
    info.push({
        'offset': 0,
        'SNo': 1,
        'suppName': entry.nameofsupplierreimbursement,
        'suppAdd': entry.addressofsupplierreimbursement,
        'billNo': entry.billnumberreimbursement,
        'billDate': entry.billdatereimbursement,
        'itemDesc': entry.descriptionofitemsreimbursement,
        'rate': entry.perunitpricereimbursement,
        'quan': entry.quantityofitemreimbursement,
        'amt': amt,
        'billLink': entry.billpleaseuploadscannedbillherereimbursement,
    });

    /** Bill 2 */
    if (entry.billnumber2reimbursement !== '') {
        rate = parseFloat(entry.perunitprice2reimbursement); if (isNaN(rate)) rate = 0;
        quan = parseFloat(entry.quantityofitems2reimbursement); if (isNaN(quan)) quan = 0;
        amt = rate * quan;
        bills.push(entry.billpleaseuploadscannedbillhere2reimbursement);
        info.push({
            'offset': 6,
            'SNo': 2,
            'suppName': entry.nameofsupplier2reimbursement,
            'suppAdd': entry.addressofsupplier2reimbursement,
            'billNo': entry.billnumber2reimbursement,
            'billDate': entry.billdate2reimbursement,
            'itemDesc': entry.descriptionofitems2reimbursement,
            'rate': entry.perunitprice2reimbursement,
            'quan': entry.quantityofitems2reimbursement,
            'amt': amt,
            'billLink': entry.billpleaseuploadscannedbillhere2reimbursement,
        });
    }

    /** Bill 3 */
    if (entry.billnumber3reimbursement !== '') {
        rate = parseFloat(entry.priceperunit3reimbursement); if (isNaN(rate)) rate = 0;
        quan = parseFloat(entry.quantityofitems3reimbursement); if (isNaN(quan)) quan = 0;
        amt = rate * quan;
        bills.push(entry.billpleaseuploadbillhere3reimbursement);
        info.push({
            'offset': 12,
            'SNo': 3,
            'suppName': entry.nameofsupplier3reimbursement,
            'suppAdd': entry.addressofsupplier3reimbursement,
            'billNo': entry.billnumber3reimbursement,
            'billDate': entry.billdate3reimbursement,
            'itemDesc': entry.descriptionofitems3reimbursement,
            'rate': entry.priceperunit3reimbursement,
            'quan': entry.quantityofitems3reimbursement,
            'amt': amt,
            'billLink': entry.billpleaseuploadbillhere3reimbursement,
        });
    }

    return [info, bills];
}


function makeOnlineForm(entry, idx) {
    return new Promise(function (resolve, reject) {
        let promises = [];

        let onlineInfo = getOnlineInfo(entry);
        let suppInfo = { name: entry.nameofsupplierdpv, code: entry.suppliercodedpv };
        promises.push(generateForms.generateCForm(onlineInfo[0], suppInfo, idx));
        promises.push(generateForms.generateOnlineForm(onlineInfo[1], idx));
        promises.push(generateForms.downloadBills(onlineInfo[2], idx));

        Promise.all(promises)
            .then(result => {
                // Append the lists of bills behind the cform
                let pdfs = [result[0], result[1]];
                pdfs = pdfs.concat(result[2]);
                return appendForms(pdfs, idx);
            })
            .then(result => {
                // Forms generated successfully
                return resolve('success');
            })
            .catch(err => {
                return reject(err);
            })
    });
}

/** Returns the info for the online form 3 bills */
function getOnlineInfo(entry) {
    let info = [];
    let bills = [];
    let totAmt = 0;

    /** Bill 1 */
    let rate = parseFloat(entry.perunitpricedpv); if (isNaN(rate)) rate = 0;
    let quan = parseFloat(entry.quantityofitemdpv); if (isNaN(quan)) quan = 0;
    let amt = rate * quan;
    totAmt += amt;
    bills.push(entry.billpleaseuploadscannedbillheredpv);
    info.push({
        'offset': 0,
        'SNo': 1,
        'suppName': entry.nameofsupplierdpv,
        'suppAdd': entry.addressofsupplierdpv,
        'billNo': entry.billnumberdpv,
        'billDate': entry.billdatedpv,
        'itemDesc': entry.descriptionofitemsdpv,
        'rate': entry.perunitpricedpv,
        'quan': entry.quantityofitemdpv,
        'amt': amt,
        'billLink': entry.billpleaseuploadscannedbillheredpv,
    });

    /** Bill 2 */
    if (entry.billnumber2 !== '') {
        rate = parseFloat(entry.perunitprice2dpv); if (isNaN(rate)) rate = 0;
        quan = parseFloat(entry.quantityofitems2dpv); if (isNaN(quan)) quan = 0;
        amt = rate * quan;
        bills.push(entry.billpleaseuploadscannedbillhere2dpv);
        totAmt += amt;
        info.push({
            'offset': 6,
            'SNo': 2,
            'suppName': entry.nameofsupplierdpv,
            'suppAdd': entry.addressofsupplierdpv,
            'billNo': entry.billnumber2,
            'billDate': entry.billdate2dpv,
            'itemDesc': entry.descriptionofitems2dpv,
            'rate': entry.perunitprice2dpv,
            'quan': entry.quantityofitems2dpv,
            'amt': amt,
            'billLink': entry.billpleaseuploadscannedbillhere2dpv,
        });
    }

    /** Bill 3 */
    if (entry.billnumber3dpv !== '') {
        rate = parseFloat(entry.priceperunit3dpv); if (isNaN(rate)) rate = 0;
        quan = parseFloat(entry.quantityofitems3dpv); if (isNaN(quan)) quan = 0;
        amt = rate * quan;
        bills.push(entry.billpleaseuploadbillhere3dpv);
        totAmt += amt;
        info.push({
            'offset': 12,
            'SNo': 3,
            'suppName': entry.nameofsupplierdpv,
            'suppAdd': entry.addressofsupplierdpv,
            'billNo': entry.billnumber3dpv,
            'billDate': entry.billdate3dpv,
            'itemDesc': entry.descriptionofitems3dpv,
            'rate': entry.priceperunit3dpv,
            'quan': entry.quantityofitems3dpv,
            'amt': amt,
            'billLink': entry.billpleaseuploadbillhere3dpv,
        });
    }

    let vendorInfo = {
        'itemDesc': entry.descriptionofitemsdpv,
        'rate': '-',
        'rateWords': '-',
        'quan': '-',
        'totalAmt': totAmt
    }

    return [info, vendorInfo, bills];
}

function makePFCform(entry, idx) {
    return new Promise(function (resolve, reject) {
        let promises = [];

        let PFCInfo = getPFCInfo(entry);
        let suppInfo = { name: entry.nameofthesupplierpfc, code: entry.suppliercodepfc };
        promises.push(generateForms.generateCForm(PFCInfo[0], suppInfo, idx));
        promises.push(generateForms.generatePFCForm(PFCInfo[1], idx));
        promises.push(generateForms.downloadBills(PFCInfo[2], idx));

        Promise.all(promises)
            .then(result => {
                // Append the lists of bills behind the cform
                let pdfs = [result[0], result[1]];
                pdfs = pdfs.concat(result[2]);
                return appendForms(pdfs, idx);
            })
            .then(result => {
                // Forms generated successfully
                return resolve('success');
            })
            .catch(err => {
                return reject(err);
            })
    });
}

/** Returns the info for the PFC from the sheet fields */
function getPFCInfo(entry) {
    let info = [];
    let totAmt = 0;
    let bills = [];

    /** Bill 1 */
    let rate = parseFloat(entry.perunitpricepfc); if (isNaN(rate)) rate = 0;
    let quan = parseFloat(entry.quantityofitemspfc); if (isNaN(quan)) quan = 0;
    let amt = rate * quan;
    totAmt += amt;
    bills.push(entry.billpleaseuploadbillherepfc);
    info.push({
        'offset': 0,
        'SNo': 1,
        'suppName': entry.nameofthesupplierpfc,
        'suppAdd': entry.addressofthesupplierpfc,
        'billNo': entry.billnumberpfc,
        'billDate': entry.billdatepfc,
        'itemDesc': entry.descriptionofitemspfc,
        'rate': entry.perunitpricepfc,
        'quan': entry.quantityofitemspfc,
        'amt': amt,
        'billLink': entry.billpleaseuploadbillherepfc,
    });

    let vendorInfo = {
        'itemDesc': entry.descriptionofitemspfc,
        'rate': '-',
        'rateWords': '-',
        'quan': '-',
        'totalAmt': totAmt
    }

    return [info, vendorInfo, bills];
}

function appendForms(pdfs, idx) {
    return new Promise(function (resolve, reject) {
        const OFile = 'forms/' + (idx + 1) + '.pdf';
        PDFMerge(pdfs, { output: OFile })
            .then((buffer) => { return resolve('done') })
            .catch(err => { return reject(err) });
    });
}

module.exports = {
    'generateAllForms': generateAllForms
}
