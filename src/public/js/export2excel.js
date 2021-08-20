let myData = [];
let myHeader = [];
let myFooter = [];

async function PrepareExportData(groupId, startDate, endDate, deviceModel) {
    var url = '/device/export-device-logs';
    var method = 'POST';
    var param = { startDate: startDate, endDate: endDate, groupId: groupId, deviceModel: deviceModel };
    var response = await CallApi(url, param, method).then(resData => {
        if (resData.status == 400) {
            return '';
        } else {
            // console.log(resData.deviceLogs)
            // var deviceLogs = resData.deviceLogs;
            return resData;
        }
    });
    // console.log(response);

    return response;
}


async function ExportDataToFile(exportData, fileName, fileType, titleName, deviceTypes) {
    if (!exportData || exportData.length === 0) {
        console.error('Chưa có data');
        return;
    }

    const wb = new ExcelJS.Workbook();

    deviceTypes.forEach(function (deviceType) {
        var uomValues = deviceType?.uom_values;
        var sheetName = deviceType?.device_type;
        var deviceModel = deviceType?.prefix;
        var data = exportData.filter(function (d) {
            if (d.serial.slice(0, 4) == deviceModel) {
                return d;
            }
        });
        if (data.length > 0) {
            const ws = wb.addWorksheet(sheetName);
            const header = Object.keys(data[0]);
            // console.log(data);

            for (const [key, value] of Object.entries(uomValues)) {
                var idx = header.indexOf(key);
                if (idx > -1) {
                    if (value.uom == '') {
                        header[idx] = `${value?.name}`;
                    } else {
                        header[idx] = `${value?.name} (${value?.uom})`;
                    }
                }
            }
            header[0] = 'Serial';
            header[1] = 'Tên thiết bị';
            header[2] = 'Thời gian';

            const columns = header?.length;


            for (let index = 3; index < columns; index++) {
                ws.getColumn(index + 1).numFmt = '#,##0.00';
            }

            // console.log(ws);
            const titleOtp = {
                border: true,
                money: false,
                height: 50,
                font: { size: 20, bold: true, color: { argb: '063970' } },
                alignment: { horizontal: 'center', vertical: 'middle', wrapText: true, },
                fill: {
                    type: 'pattern',
                    pattern: 'solid', //darkVertical
                    fgColor: {
                        argb: 'FFFFFF',
                    },
                },
            };
            const headerOtp = {
                border: true,
                money: false,
                height: 30,
                font: { size: 15, bold: false, color: { argb: 'FFFFFF' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                fill: {
                    type: 'pattern',
                    pattern: 'solid', //darkVertical
                    fgColor: {
                        argb: '0F3FA0',
                    },
                },
            };
            const dataOtp = {
                border: true,
                money: false,
                height: 0,
                font: { size: 12, bold: false, color: { argb: '000000' } },
                alignment: { horizontal: 'right', vertical: 'middle' },
                fill: null,
            };
            const footerOtp = {
                border: true,
                money: true,
                height: 70,
                font: { size: 15, bold: true, color: { argb: 'FFFFFF' } },
                alignment: null,
                fill: {
                    type: 'pattern',
                    pattern: 'solid', //darkVertical
                    fgColor: {
                        argb: '0000FF',
                    },
                },
            };



            let row = addRow(ws, [titleName], titleOtp);
            mergeCells(ws, row, 1, columns);

            // console.log('header', header);
            addRow(ws, header, headerOtp);
            data.forEach((rowData) => {
                addRow(ws, Object.values(rowData), dataOtp);
            });
            ws.columns.forEach(function (column) {
                var dataMax = 0;
                column.eachCell(function (cell, rowNumber) {
                    if (rowNumber > 1) {
                        var columnLength = cell?.value?.toString()?.length;
                        // console.log(columnLength)
                        if (columnLength > dataMax) {
                            dataMax = columnLength + 10;
                        }
                    }
                })
                column.width = dataMax < 20 ? 20 : dataMax;
            });
        }
    })

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `${fileName}.${fileType}`);
}

function addRow(ws, data, section) {
    const borderStyles = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
    const row = ws.addRow(data);
    // console.log('addRow', section, data);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (section?.border) {
            cell.border = borderStyles;
        }
        if (section?.money && typeof cell.value === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '$#,##0.00;[Red]-$#,##0.00';
        }
        if (section?.alignment) {
            cell.alignment = section.alignment;
        } else {
            cell.alignment = { vertical: 'middle' };
        }
        if (section?.font) {
            cell.font = section.font;
        }
        if (section?.fill) {
            cell.fill = section.fill;
        }
    });
    if (section?.height > 0) {
        row.height = section.height;
    }
    return row;
}

function mergeCells(ws, row, from, to) {
    // console.log(
    // 	'mergeCells',
    // 	row,
    // 	from,
    // 	to,
    // 	row.getCell(from)._address,
    // 	row.getCell(to)._address
    // );
    ws.mergeCells(`${row.getCell(from)._address}:${row.getCell(to)._address}`);
}

function columnToLetter(column) {
    var temp,
        letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}