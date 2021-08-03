// 
// 
// js for device_value.hbs
// 
// 
$(document).ready(function () {
    // socket
    var socketName = $('#socketName').val();
    var socket = io('', { query: `socketName=${socketName}` });


    socket.on('server_data_sensor', function (data) {
        $('#value').html(data)
    })

    socket.on('device_disconnect', function (data) {
        var serial = data
        if (serial.slice(0, 4) == 'BSGW') {
            $(`.label-device[dev-gateway*=${serial}] .device-on`).toggleClass('device-on device-off');
        } else {
            var status = $(`#device-data-${serial} .device-status`).hasClass('device-on');
            if (status) {
                $(`#device-data-${serial} .device-status`).toggleClass('device-on device-off');
            }
        }
        //$(`#device-data-${serial} .value`).html('N/a');
    })

    socket.on('node_device_disconnect', function (data) {
        var serial = data;
        $(`#device-data-${serial} .device-on`).toggleClass('device-on device-off');
        //$(`#device-data-${serial} .value`).html('N/a');
    })
    //socket start real time device
    async function StartRealTime() {
        var list_devices = [];
        var list_gateway = [];
        $('.device-serial').each(function () {
            if ($(this).attr('dev-gateway') == '' || $(this).attr('dev-gateway') == 'none') {
                list_devices.push($(this).val())
            } else {
                if (list_gateway.indexOf($(this).attr('dev-gateway')) < 0) {
                    list_gateway.push($(this).attr('dev-gateway'));
                }
            }
        })
        socket.emit('start_real_time_device', { list_devices, list_gateway, socketName });
    }
    socket.on(socketName, function (device) {
        //console.log(device);
        if (!device.serial || !device.data) {
            return;
        }
        var serial = device.serial;
        var arr_value = device.data.val;
        var dev_type = serial.slice(4);
        if (dev_type != 'AHSD') {
            var battery = device.data.battery || 'N/a';
            var rssi = device.data.rssi || 'N/a';
            var status = $(`#device-data-${serial} .device-status`).hasClass('device-off');
            if (status) {
                $(`#device-data-${serial} .device-status`).toggleClass('device-off device-on');
            }
            var value = Object.values(arr_value).reduce((pre_val, cur_val, key) => pre_val += "</br>" + cur_val)
            $(`#device-data-${serial} .value`).html(value);
            $(`#device-data-${serial} .battery .sub-value`).html(battery);
            $(`#device-data-${serial} .rssi .sub-value`).html(rssi);
        }
    })
    StartRealTime();

    // get value
    async function ValuePrepare(serial, startDate, endDate) {
        return await postData('/device/device-logs', { serial: serial, startDate: startDate, endDate: endDate })
            .then(resData => {
                if (resData.status == 400) {
                    $('#mask').hide();
                    return '';
                }
                else {
                    // console.log(resData.deviceLogs)
                    var deviceLogs = resData.deviceLogs;
                    return deviceLogs;
                }
            });
    }

    //Event menu
    $(document).on("click", ".sensor-btn", function () {
        var group_id = $(this).parent().attr('id');
        var dev_type = $(this).attr('dev-type');
        var idChart = `chart-${group_id}-${dev_type}`;
        $(`#${group_id} .sensor-btn[dev-type*="${dev_type}"]`).toggleClass("btn-on");
        $(`#${group_id} .devices[dev-type*="${dev_type}"]`).collapse('toggle');
    })
    //click device label to draw chart
    $(document).on("click", ".label-device", async function () {
        var devType = $(this).attr('dev-type');
        var devGroup = $(this).attr('dev-group');
        var idChart = 'chart-' + devGroup + '-' + devType;
        var serial = $(this).attr('dev-sn');
        var chart = Chart.getChart(idChart);
        var data = [];
        var dtpValue = $('#dtp-' + devGroup + '-' + devType).val().split(' ~ ');
        var startDate = dtpValue[0];
        var endDate = dtpValue[1];
        var uomValue = $('#uom' + '-' + devGroup + '-' + devType).val();
        var uomText = $('#uom' + '-' + devGroup + '-' + devType + ' option[value*="' + uomValue + '"]').text();
        var title = startDate + ' đến ' + endDate + '  ( ' + uomText + ' )';


        $('#mask').show();
        var deviceLogs = await ValuePrepare(serial, startDate, endDate);
        if (deviceLogs) {
            deviceLogs.forEach((log) => {
                var dbValue = [];
                for (var key of Object.keys(log.device_value)) {
                    if (key == uomValue) {
                        dbValue = log.device_value[key].split('-')
                    }
                }

                var value = dbValue[0];
                var uom = dbValue[1];
                var chartData = { x: log.createdAt, y: value * 1 }
                data.push(chartData);
            });
        }
        $('#mask').hide();
        $(this).toggleClass('chart-active');
        var checkActive = $('#' + devGroup + ' .devices[dev-type*="' + devType + '"] .label-device').hasClass('chart-active')
        if (checkActive) {
            if (!chart) {
                DrawChart(idChart, serial, data, title);
            } else {
                if ($(this).hasClass('chart-active')) {
                    addData(chart, serial, data);
                } else {
                    removeDataset(chart, serial);
                }
            }
        } else {
            chart.destroy();
        }
    })
    // function update chart
    $('.uom-dropdown-lst').on('change', async function (e) {
        try {
            $('#mask').show();
            idChart = $(this).attr('chart-id');

            var uomValue = $(idChart.replace('chart-', '#uom-')).val();
            var dtpValue = $(idChart.replace('chart-', '#dtp-')).val().split(' ~ ');
            var startDate = dtpValue[0];
            var endDate = dtpValue[1];
            var uomText = $(idChart.replace('chart-', '#uom-') + ' option[value*="' + uomValue + '"]').text();
            var title = startDate + ' đến ' + endDate + '  ( ' + uomText + ' )';
            var chart = Chart.getChart(idChart);
            if (chart) {
                var label = chart.data.datasets.map((v) => v.label);
                var deviceLogs = await ValuePrepare(label, startDate, endDate);
                RefreshChart(chart, label, deviceLogs, title, uomValue);
            }
            $('#mask').hide();

        } catch (e) {
            $('#mask').hide();
            console.log(e)
        }
    })
    $('.date-picker-input').bind('datepicker-change', async function (event, obj) {
        try {
            $('#mask').show();
            idChart = $(this).attr('chart-id');

            var uomValue = $(idChart.replace('chart-', '#uom-')).val();
            var dtpValue = $(this).val().split(' ~ ');
            var startDate = dtpValue[0];
            var endDate = dtpValue[1];
            var uomText = $(idChart.replace('chart-', '#uom-') + ' option[value*="' + uomValue + '"]').text();
            var title = startDate + ' đến ' + endDate + '  ( ' + uomText + ' )';
            var chart = Chart.getChart(idChart);
            if (chart) {
                var label = chart.data.datasets.map((v) => v.label);
                var deviceLogs = await ValuePrepare(label, startDate, endDate);
                RefreshChart(chart, label, deviceLogs, title, uomValue);
            }
            $('#mask').hide();

        } catch (e) {
            $('#mask').hide();
            console.log(e)
        }
    })

    function RefreshChart(chart, labels, deviceLogs, title, uomValue) {
        try {
            $('#mask').show();
            var datasets = [];
            labels.forEach(function (label) {
                var data = [];
                var colorCode = Colors.random();
                deviceLogs.forEach(function (log) {
                    if (log.device_serial == label) {
                        var dbValue = [];
                        for (var key of Object.keys(log.device_value)) {
                            if (key == uomValue) {
                                dbValue = log.device_value[key].split('-')
                            }
                        }
                        var value = dbValue[0];
                        var uom = dbValue[1];
                        var chartData = { x: log.createdAt, y: value * 1 }
                        data.push(chartData);
                    }
                });
                var dataset = {
                    label: label,
                    data: data,
                    backgroundColor: [
                        colorCode
                    ],
                    borderColor: [
                        colorCode
                    ],
                    borderWidth: 1
                }
                datasets.push(dataset);
                data = [];
            });
            chart.data.datasets = datasets;
            chart.options.plugins.title.text = title;
            chart.update();
            $([document.documentElement, document.body]).animate({
                scrollTop: $("#" + chart.canvas.id).offset().top
            }, 500);
            $('#mask').hide();
        } catch (e) {
            console.log(e);
            $('#mask').hide();
        }
    }

    //date time picker

    $('.date-picker-input').each(function () {
        var id = '#' + this.id;
        var today = new Date()
        var startDate = String(today.getFullYear()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + ' ' + '00:00';
        var endDate = String(today.getFullYear()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + ' ' + '23:59';
        this.value = startDate + ' ~ ' + endDate;

        var options = {
            startOfWeek: 'monday',
            separator: ' ~ ',
            maxDays: 2,
            minDays: 1,
            format: 'YYYY-MM-DD HH:mm',
            autoClose: true,
            time: {
                enabled: true
            }
        }
        $(id).dateRangePicker(options);
    })
    // call api get data device
    async function postData(url = '', data = {}) {
        // Default options are marked with *
        const response = await fetch(url, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json'
                //'Content-Type': 'application/x-www-form-urlencoded',
                //'Accept': 'application/json'
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        if (response.status == 200)
            return response.json(); // parses JSON response into native JavaScript objects
        return response
    }
    // draw charjs with data struct [{x: datetime, y:value}]
    function DrawChart(idCanvas, label, data, title) {
        var ctx = document.getElementById(idCanvas);
        var colorCode = Colors.random();
        if (ctx)
            var myChart = new Chart(ctx, {
                type: 'line',
                labels: '123',
                data: {
                    datasets: [{
                        label: label,
                        data: data,
                        backgroundColor: [
                            colorCode
                        ],
                        borderColor: [
                            colorCode
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                displayFormats: {
                                    quarter: 'dd/MM HH:mm'
                                }
                            },
                        },
                        y: {
                            beginAtZero: true
                        }
                    },
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: title
                        }
                    },
                }
            });
        $([document.documentElement, document.body]).animate({
            scrollTop: $("#" + idCanvas).offset().top
        }, 500);
    }

    // random color chart
    var dynamicColors = function (randNum) {
        var r = Math.floor(Math.random() * 255);
        var g = Math.floor(Math.random() * 255);
        var b = Math.floor(Math.random() * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    };
    // add datasets
    function addData(chart, label, data) {
        //chart.data.labels.push(label);
        var chartLength = chart.data.datasets.length;
        var colorCode = Colors.random();
        var dataset = {
            label: label,
            data: data,
            backgroundColor: [
                colorCode
            ],
            borderColor: [
                colorCode
            ],
            borderWidth: 1
        }
        chart.data.datasets.push(dataset);
        chart.update();
        $([document.documentElement, document.body]).animate({
            scrollTop: $("#" + chart.canvas.id).offset().top
        }, 500);
    }
    // remove dataset
    function removeDataset(chart, label) {
        chart.data.datasets = chart.data.datasets.filter(function (obj) {
            return (obj.label != label);
        });
        chart.update();
        $([document.documentElement, document.body]).animate({
            scrollTop: $("#" + chart.canvas.id).offset().top
        }, 500);
    }
})
