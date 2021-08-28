//Script for device_value_ahsd.hbs - xem giá trị thiết bị quản lý ahsd


//tab controll
function openGroupContent(idgateWay, element, idGroup) {
    $(`#${idGroup} .tab-content`).hide();
    $(`#${idGroup} .tab-link`).removeClass('tab-active');
    $(element).toggleClass('tab-active');
    $(`#${idgateWay}`).show();
}

$(document).ready(function () {
    //datepicker 
    $('.date-picker').each(function () {
        var dpId = '#' + $(this).attr('id');
        var today = new Date()
        var startDate = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getFullYear()).padStart(2, '0') + ' ' + '00:00';
        var endDate = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getFullYear()).padStart(2, '0') + ' ' + '23:59';
        this.value = startDate + ' ~ ' + endDate;
        var chartId = $(this).attr('chart-id');
        var devGroup = $(this).parents('.tab-content').attr('id');

        var options = {
            language: "vn",
            monthSelect: true,
            yearSelect: true,
            startOfWeek: 'monday',
            separator: ' ~ ',
            maxDays: 2,
            minDays: 1,
            format: 'DD-MM-YYYY HH:mm',
            autoClose: true,
            time: {
                enabled: true
            },
            singleDateMultipleTime: true
        }

        $(dpId).dateRangePicker(options);
        $(dpId).bind('datepicker-change', function (event, obj) {
            RefreshChart(chartId, devGroup);
        })
    });
    //click default tab
    $('.tab-controll .tab-link:first-child').trigger('click');
    //$('.device-type-group-controll .device-type-controll:first-child').trigger('click');

    //socket io
    var socket = io();
    var user = $('#user').val();
    var listDevices = [];
    $('.device_sn').map(function (e) {
        var device_sn = this.value;
        listDevices.push(device_sn);
    })
    //start real time
    function StartRealTime() {
        //console.log(listGateWay);
        if (listDevices) {
            socket.emit('start_real_time_device', { listDevices, user });
        }


    }
    StartRealTime();

    //Device connected
    socket.on('device_connect', function (data) {
        if (listDevices.indexOf(data) != -1) {
            $(`#tab-${data}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#tab-${data}`).addClass('status-1');
            socket.emit('start_real_time_device', { listDevices, user });
        }
    })

    //on realtime value

    socket.on('realtime_device_value', function (data) {
        // value = {serial: ..., value: {...}}
        // console.log(data);
        var serial = data?.serial;
        if (data.data.val) {
            for (const [key, value] of Object.entries(data.data.val)) {
                var idxValue = key;
                var idValueType = 'val-' + serial + '-' + idxValue;
                if (!$(`#tab-${serial}`).hasClass('status-1')) {
                    $(`#tab-${serial}`).removeClass('status-1 status-2 status-0 status-na');
                    $(`#tab-${serial}`).addClass('status-1');
                }
                $(`#${idValueType} .device-item-value .value`).html(value);
            }
        }

        //console.log(deviceSn, value)
    });

    //check device disconnect
    socket.on('device_disconnect', function (data) {
        if (String(data).slice(0, 4) == 'AHSD') {
            $(`#tab-${data}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#tab-${data}`).addClass('status-0');

            $(`#dev-${data} .device-item .device-item-value .value`).html("N/a");
        }
    })


    //draw chart
    // prepare data draw chart
    async function PrepareChartData(serial, startDate, endDate) {
        var url = '/device/device-logs';
        var method = 'POST';
        var param = { serial: serial, startDate: startDate, endDate: endDate };
        var response = await CallApi(url, param, method).then(resData => {
            if (resData.status == 400) {
                return '';
            }
            else {
                // console.log(resData.deviceLogs)
                var deviceLogs = resData.deviceLogs;
                return deviceLogs;
            }
        });
        return response;
    }

    // event draw chart
    $(document).on('click', '.device-item', async function () {
        $('#mask').show();
        var serial = $(this).attr('device-sn');
        var valueName = $(this).attr('value-name');
        var keyValue = $(this).attr('key-value');
        var idDataSet = keyValue;
        var chartId = `chart-${serial}`;
        var chart = Chart.getChart(chartId);
        var uomValue = $(this).attr('uom');
        var color = $(this).attr('color');
        var dpValue = $(`#date-picker-${serial}`).val().split(' ~ ');
        var startDate = dpValue[0];
        var endDate = dpValue[1];
        var startTime = startDate.slice(11);
        var endTime = endDate.slice(11);
        var chartTitle = String(`Thông số dinh dưỡng - Từ ${startTime} đến ${endTime}`).toUpperCase();
        var idYaxis = 'y' + keyValue;

        var onChart = $(this).attr('on-chart');

        if (onChart == 'true') {
            $(this).attr('on-chart', 'false');
            $(this).removeClass('on-chart');
            var checkOnChart = $(`#dev-${serial} .device-item`).hasClass('on-chart');
            if (!checkOnChart) {
                if (chart) {
                    chart.destroy();
                    $(`#dev-${serial} .chart-area`).hide();
                }
            } else {
                RemoveDataChart(chart, idDataSet, idYaxis);
            }
        } else {
            $(`#uom-key-${serial}`).val(keyValue);
            var chartData = await PrepareChartData(serial, startDate, endDate);
            var dataset = {
                id: idDataSet,
                label: valueName,
                data: [],
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                yAxisID: '',
            };

            if (chartData) {
                chartData.forEach((log, index) => {
                    var value = log.device_value[keyValue];
                    var data = { x: log.createdAt, y: value * 1 }
                    dataset.data.push(data);
                });
                dataset.yAxisID = idYaxis;
            }
            if (!chart) {
                $(`#dev-${serial} .chart-area`).show();
                RenderChart(chartId, dataset, chartTitle, idYaxis);
            } else {
                chart.data.datasets.push(dataset);
                chart.options.scales[idYaxis].display = true;
                chart.update();
                ScrollToElement(chartId);
            }
            $(this).addClass('on-chart');
            $(this).attr('on-chart', 'true');
        }
        $('#mask').hide();
    })

    //render chart
    function RenderChart(chartId, dataset, chartTitle, idYaxis) {
        var ctx = document.getElementById(chartId);
        var options = {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour'
                    },
                    ticks: {
                        color: "#fff"
                    },
                    grid: {
                        drawOnChartArea: true,
                        color: "rgb(80 80 80 / 20%)", // only want the grid lines for one axis to show up
                    },
                },
                y: {
                    //PH
                    ticks: {
                        display: false,
                    },
                    display: true,
                    grid: {
                        drawBorder: false,
                        drawOnChartArea: true,
                        color: "rgb(80 80 80 / 20%)", // only want the grid lines for one axis to show up
                        //borderColor: '#179c52',
                        borderWidth: 0,
                    },
                },
                yph: {
                    //PH
                    ticks: {
                        color: "#fff"
                    },
                    display: false,
                    grid: {
                        drawOnChartArea: false,
                        color: "rgb(80 80 80 / 20%)", // only want the grid lines for one axis to show up
                        borderColor: '#179c52',
                        borderWidth: 4,
                    },
                },
                yec: {
                    //EC
                    ticks: {
                        color: "#fff"
                    },
                    display: false,
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                        borderColor: '#f7b529',
                        borderWidth: 4,
                    },
                },
                ytemps: {
                    //TEMP
                    position: 'right',
                    ticks: {
                        color: "#fff"
                    },
                    display: false,
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                        borderColor: '#ff3e30',
                        borderWidth: 4,
                    },
                },
                ydo: {
                    //OXY
                    position: 'right',
                    ticks: {
                        color: "#fff"
                    },
                    display: false,
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                        borderColor: '#176bef',
                        borderWidth: 4,
                    },
                },
                yorp: {
                    //OXY
                    position: 'right',
                    ticks: {
                        color: "#fff"
                    },
                    display: false,
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                        borderColor: '#553186',
                        borderWidth: 4,
                    },
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#fff'
                    }
                },
                title: {
                    display: true,
                    text: chartTitle,
                    color: '#fff',
                    font: { size: 15, weight: 'bold' }
                }
            },
        };
        options.scales[idYaxis].display = true;
        if (ctx) {
            var myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [dataset]
                }, options
            });
            ScrollToElement(chartId);
        }

    }

    //remove data in datasets
    function RemoveDataChart(chart, id, idYaxis) {
        chart.data.datasets = chart.data.datasets.filter(function (obj) {
            return (obj.id != id);
        });
        chart.options.scales[idYaxis].display = false;
        chart.update();
    }

    //refresh chart
    async function RefreshChart(chartId, devGroup) {
        var chart = Chart.getChart(chartId);
        if (!chart) {
            return;
        }
        $('#mask').show();
        var currDatasets = chart.data.datasets;
        var idDatasets = currDatasets.map((value) => {
            return value.id;
        })
        var serial = $(`#${devGroup} .device_sn`).val();
        var dpValue = $(`#date-picker-${serial}`).val().split(' ~ ');
        var startDate = dpValue[0];
        var endDate = dpValue[1];
        var startTime = startDate.slice(11);
        var endTime = endDate.slice(11);
        var chartTitle = String(`Thông số dinh dưỡng - Từ ${startTime} đến ${endTime}`).toUpperCase();
        var chartData = await PrepareChartData(serial, startDate, endDate);
        var newDatasets = [];
        idDatasets.forEach((idDataset) => {
            var idTypeDevice = `#val-${serial}-${idDataset}`
            var valueName = $(idTypeDevice).attr('value-name');
            var color = $(idTypeDevice).attr('color');
            var dataset = {
                id: idDataset,
                label: valueName,
                data: [],
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                yAxisID: '',
            };
            if (chartData) {
                chartData.forEach((log, index) => {
                    var value = log.device_value[idDataset];
                    var data = { x: log.createdAt, y: value * 1 }
                    dataset.data.push(data);
                });
                dataset.yAxisID = 'y' + idDataset;
                newDatasets.push(dataset);
            }
        });
        chart.data.datasets = newDatasets;
        chart.options.plugins.title.text = chartTitle;
        chart.update();
        ScrollToElement(chartId);
        $('#mask').hide();
    }

    //Quick time controll
    $(document).on('click', '.quick-time-item', function () {
        var devGroup = $(this).parents('.tab-content').attr('id');
        var chartId = $(`#${devGroup} .chart-canvas`).attr('id');
        var limitTime = $(this).data('time-limit');
        var currentDate = $(`#${devGroup} .date-picker`).val().split(" ~ ");
        var currHour = moment().hour();
        var currMinute = moment().minute();
        var startTime;
        var endTime;
        if (limitTime != '24') {
            var startHour = currHour - limitTime > 0 ? currHour - limitTime : 0;
            startTime = String(startHour).padStart(2, '0') + ":" + String(currMinute).padStart(2, '0');
            endTime = String(currHour).padStart(2, '0') + ":" + String(currMinute).padStart(2, '0');
        } else {
            startTime = "00:00";
            endTime = String(currHour).padStart(2, '0') + ":" + String(currMinute).padStart(2, '0');
        }
        var startDate = currentDate[0].slice(0, 11) + startTime;
        var endDate = currentDate[1].slice(0, 11) + endTime;
        var newDate = startDate + ' ~ ' + endDate;

        $(`#${devGroup} .quick-time-item`).removeClass('high-light-box');
        $(this).addClass('high-light-box');

        $(`#${devGroup} .date-picker`).val(newDate);


        RefreshChart(chartId, devGroup);
    })

    //show and hide group device
    $('#selectGroupDevice').on('change', function () {
        var idGroupWrapper = '#group-wrapper-' + $(this).val();
        $('.group-wrapper').hide();
        $(idGroupWrapper).show();
    })


    //export data to excel

    //date picker export
    var today = new Date()
    var startDate = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getFullYear()).padStart(2, '0') + ' ' + '00:00';
    var endDate = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getFullYear()).padStart(2, '0') + ' ' + '23:59';
    $('#dateExport').val(startDate + ' ~ ' + endDate);

    var options = {
        language: "vn",
        monthSelect: true,
        yearSelect: true,
        startOfWeek: 'monday',
        separator: ' ~ ',
        maxDays: 31,
        minDays: 1,
        format: 'DD-MM-YYYY HH:mm',
        autoClose: true,
        time: {
            enabled: true
        }
    }
    $('#dateExport').dateRangePicker(options);

    //event show model export
    $(document).on('click', '.export-data-btn', async function () {
        var groupId = $(this).data('group-id');
        $('#deviceGroupExport option[value="'+groupId+'"]').prop('selected',true);

        $('#exportModal').modal('show');
    })
    $('#exportModalSubmit').on('click', async function () {
        var idGroup = $('#deviceGroupExport').val();
        var dateExport = $('#dateExport').val().split(' ~ ');
        var startDate = dateExport[0];
        var endDate = dateExport[1];
        var deviceModel = 'AHSD';

        ExportData(idGroup, startDate, endDate, deviceModel)
    })
    //func export data

    async function ExportData(idGroup, dateStart, dateEnd, deviceModel) {
        $('#mask').show();

        var title = `Thống kê dinh dưỡng \n từ ${dateStart} đến ${dateEnd}`;
        var fileName = `Thống kê dinh dưỡng từ ${dateStart} đến ${dateEnd}`;
        var fileExtension = 'xlsx';

        var getData = await PrepareExportData(idGroup, dateStart, dateEnd, deviceModel);
        if (getData.deviceLogs.length > 0) {

            var deviceLogs = getData.deviceLogs;
            var deviceTypes = getData.deviceType;

            var exportData = deviceLogs.map((d) => {
                var logValue = d?.device_value;
                var LogDate = moment(d?.createdAt).format("DD/MM/YYYY HH:mm");
                var data = {
                    serial: d?.device_serial,
                    deviceName: d?.devices?.device_name,
                    date: LogDate,
                };

                if (logValue) {
                    for (const [key, value] of Object.entries(logValue)) {
                        if (value == 'none') {
                            data[key] = value;
                        } else {
                            data[key] = value * 1;
                        }
                    }
                }
                return data;
            });
            // console.log(exportData);
            await ExportDataToFile(exportData, fileName, fileExtension, title, deviceTypes).finally(function () {
                $('#mask').hide();
            });
        } else {
            alertAction('failure', 'Không có dữ liệu để xuất');
            $('#mask').hide();
        }

    }
})