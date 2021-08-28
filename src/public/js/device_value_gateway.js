//Scrip device_value_gateway.hbs - xem giá trị các node trong gateway


//tab controll
function openGroupContent(idgateWay, element, idGroup) {
    $(`#${idGroup} .tab-content`).hide();
    $(`#${idGroup} .tab-link`).removeClass('tab-active');
    $(element).toggleClass('tab-active');
    $(`#${idgateWay}`).show();
}
//scroll when collapse
$('.device-group').on('shown.bs.collapse', function () {
    ScrollToElement($(this).attr('id'));
});


//click to active device type button
$(document).on('click', '.device-type-controll', function () {
    $(this).toggleClass('collapse-open');
})
$(document).ready(function () {
    //datepicker 
    $('.date-picker').each(function () {
        var dpId = '#' + $(this).attr('id');
        var today = new Date()
        var startDate = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getFullYear()).padStart(2, '0') + ' ' + '00:00';
        var endDate = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getFullYear()).padStart(2, '0') + ' ' + '23:59';
        this.value = startDate + ' ~ ' + endDate;
        var chartId = $(this).attr('chart-id');
        var devGroup = $(this).attr('dev-group');

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
    $('.gateway_sn').map(function (e) {
        var gateway_sn = this.value;
        listDevices.push(gateway_sn);
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
            $(`#tab-control-${data}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#tab-control-${data}`).addClass('status-1');

            socket.emit('start_real_time_device', { listDevices, user });
        }
    })
    //on realtime value

    socket.on('realtime_device_value', function (data) {
        // value = {serial: ..., value: {...}}
        var serial = data?.serial;
        var data = data?.data;
        var rssi = data?.rssi;
        var battery = data?.battery;
        var idGateway = $(`#dev-${serial}`).attr('gateway');
        console.log(idGateway);
        if(data.val){
            for (const [key, value] of Object.entries(data.val)) {
                $(`#${key}-${serial}`).html(value);
            }
        }
        
        if (!$(`#dev-${serial}`).hasClass('status-1') || !$(`#tab-control-${idGateway}`).hasClass('status-1')) {
            $(`#dev-${serial}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#dev-${serial}`).addClass('status-1');
            $(`#tab-control-${idGateway}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#tab-control-${idGateway}`).addClass('status-1');
        }

        $(`#dev-${serial} .device-item-battery .value`).html(battery);
        $(`#dev-${serial} .device-item-rssi .value`).html(rssi);
        //console.log(serial, data)
    });

    //check device disconnect
    socket.on('device_disconnect', function (serial) {
        if (String(serial).slice(0, 4) == 'BSGW') {
            $(`#gw-${serial} .device-item`).removeClass('status-1 status-2 status-0 status-na');
            $(`#tab-control-${serial}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#gw-${serial} .device-item`).addClass('status-0');
            $(`#tab-control-${serial}`).addClass('status-0');

            $(`#gw-${serial} .device-item .device-item-battery .value`).html("N/a");
            $(`#gw-${serial} .device-item .device-item-rssi .value`).html("N/a");
            $(`#gw-${serial} .device-item .device-item-value .value-wrapper .value`).html("N/a");
        } else {
            $(`#dev-${serial}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#dev-${serial}`).addClass('status-0');

            $(`#dev-${serial} .device-item-battery .value`).html("N/a");
            $(`#dev-${serial} .device-item-rssi .value`).html("N/a");
            $(`#dev-${serial} .device-item-value .value-wrapper .value`).html("N/a");
        }
    })

    //update node status
    socket.on('node_status', function (data) {
        var serial = data.serial;
        var status = data.status;

        if (status == '0' || status == '2') {
            $(`#dev-${serial}`).removeClass('status-1 status-2 status-0 status-na');
            $(`#dev-${serial}`).addClass(`status-${status}`);

            $(`#dev-${serial} .device-item-battery .value`).html("N/a");
            $(`#dev-${serial} .device-item-rssi .value`).html("N/a");
            $(`#dev-${serial} .device-item-value .value-wrapper .value`).html("N/a");
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
        var devName = $(this).attr('dev-name');
        var gateway = $(this).attr('gateway');
        var devType = $(this).attr('dev-type');
        var chartId = `chart-${gateway}-${devType}`;
        var chart = Chart.getChart(chartId);
        var onChart = $(this).data('on-chart');
        var uom = $(`#uom-${gateway}-${devType} option:selected`).attr('uom');
        var uomName = $(`#uom-${gateway}-${devType} option:selected`).attr('uom-name');
        var uomKey = $(`#uom-${gateway}-${devType}`).val();
        var typeName = $(this).attr('type-name');
        var color = Colors[$(this).attr('color-idx')];
        var dpValue = $(`#date-picker-${gateway}-${devType}`).val().split(' ~ ');
        var startDate = dpValue[0];
        var endDate = dpValue[1];

        var chartTitle = String(`Thông số ${uomName} ( ${uom} ) -  Ngày ${startDate.slice(0, 11)} Từ ${startDate.slice(11)} đến ${endDate.slice(11)}`).toUpperCase();

        if (onChart == 'true') {
            $(this).data('on-chart', 'false');
            $(this).removeClass('on-chart');

            var checkDeviceSelected = $(`#dev-type-${gateway}-${devType} .device-item`).hasClass('on-chart');
            if (!checkDeviceSelected) {
                chart.destroy();
                $(`#dev-type-${gateway}-${devType} .chart-area`).hide();
                ScrollToElement($(this).attr('id'));
            } else {
                RemoveDataChart(chart, serial);
                ScrollToElement(chartId);
            }
        } else {
            $(this).data('on-chart', 'true');
            $(this).addClass('on-chart');

            var chartData = await PrepareChartData(serial, startDate, endDate);
            var dataset = {
                id: serial,
                label: devName,
                data: [],
                backgroundColor: [
                    color
                ],
                borderColor: [
                    color
                ],
                borderWidth: 1
            };

            if (chartData) {
                chartData.forEach((log) => {
                    var dbValue;
                    for (var key of Object.keys(log.device_value)) {
                        if (key == uomKey) {
                            dbValue = log.device_value[key]
                        }
                    }
                    var value = dbValue;
                    var data = { x: log.createdAt, y: value * 1 }
                    dataset.data.push(data);
                });
            }
            if (!chart) {
                $(`#dev-type-${gateway}-${devType} .chart-area`).show();
                RenderChart(chartId, dataset, chartTitle);
            } else {
                chart.data.datasets.push(dataset);
                chart.update();
                ScrollToElement(chartId);
            }
        }
        $('#mask').hide();
    })

    //render chart
    function RenderChart(chartId, dataset, chartTitle) {
        var ctx = document.getElementById(chartId);
        if (ctx) {
            var myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [dataset]
                },
                options: {
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
                                color: "rgb(121 121 121 / 70%)" // only want the grid lines for one axis to show up
                            },
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: "#fff"
                            },
                            grid: {
                                drawOnChartArea: true,
                                color: "rgb(121 121 121 / 70%)" // only want the grid lines for one axis to show up
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
                }
            });
            ScrollToElement(chartId);
        }

    }

    //remove data in datasets
    function RemoveDataChart(chart, id) {
        chart.data.datasets = chart.data.datasets.filter(function (obj) {
            return (obj.id != id);
        });
        chart.update();
    }

    //event refresh chart
    $(document).on('change', '.list-uom', function () {
        var chartId = $(this).attr('chart-id');
        var devGroup = $(this).attr('dev-group');

        RefreshChart(chartId, devGroup);
    })

    //refresh chart
    async function RefreshChart(chartId, devGroup) {

        var serials = [];
        var chart = Chart.getChart(chartId);

        if (chart) {
            chart.data.datasets.forEach(function (data) {
                var id = data.id;
                serials.push(id);
            });
        } else {
            return;
        }
        $('#mask').show();

        var dpValue = $(`#${devGroup} .date-picker`).val().split(' ~ ');
        var startDate = dpValue[0];
        var endDate = dpValue[1];
        var uom = $(`#${devGroup} .list-uom option:selected`).attr('uom');
        var uomKey = $(`#${devGroup} .list-uom`).val();
        var uomName = $(`#${devGroup} .list-uom option:selected`).attr('uom-name');
        var typeName = $(`#${devGroup}`).attr('group-label');
        var chartTitle = String(`Thông số ${uomName} ( ${uom} )  - Ngày ${startDate.slice(0, 11)} Từ ${startDate.slice(11)} đến ${endDate.slice(11)}`).toUpperCase();
        var datasets = [];

        var deviceLogs = await PrepareChartData(serials, startDate, endDate);

        if (deviceLogs) {
            serials.forEach(function (serial) {
                var colorIdx = $(`#dev-${serial}`).attr('color-idx');
                var color = Colors[colorIdx];
                var devName = $(`#dev-${serial}`).attr('dev-name');

                var dataset = {
                    id: serial,
                    label: devName,
                    data: [],
                    backgroundColor: [
                        color
                    ],
                    borderColor: [
                        color
                    ],
                    borderWidth: 1
                };
                deviceLogs.forEach(function (log) {
                    if (log.device_serial == serial) {
                        var dbValue;
                        for (var key of Object.keys(log.device_value)) {
                            if (key == uomKey) {
                                dbValue = log.device_value[key]
                            }
                        }

                        var value = dbValue;
                        var data = { x: log.createdAt, y: value * 1 }
                        dataset.data.push(data);
                    }
                })

                datasets.push(dataset);
            })

            chart.data.datasets = datasets;
            chart.options.plugins.title.text = chartTitle;
            chart.update();
            ScrollToElement(chartId);
        }
        //console.log(datasets);
        $('#mask').hide();
    }

    //Quick time controll
    $(document).on('click', '.quick-time-item', function () {
        var devGroup = $(this).parents('.device-group').attr('id');
        var chartId = $(`#${devGroup}`).attr('chart-id');
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

    //change color icon
    //battery
    $(document).on('DOMSubtreeModified', '.device-item-battery .value', function () {
        var value = $(this).text();
        if (value < 10) {
            if (!$(this).parent().hasClass('status-low')) {
                $(this).parent().toggleClass('status-low')
            }
        } else {
            if ($(this).parent().hasClass('status-low')) {
                $(this).parent().toggleClass('status-low')
            }
        }
    })

    //rssi
    $(document).on('DOMSubtreeModified', '.device-item-rssi .value', function () {
        var value = $(this).text();
        if (value < (120 * -1)) {
            if (!$(this).parent().hasClass('status-low')) {
                $(this).parent().toggleClass('status-low')
            }
        } else {
            if ($(this).parent().hasClass('status-low')) {
                $(this).parent().toggleClass('status-low')
            }
        }
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
        var deviceModel = $(this).data('default-model');
        var groupId = $(this).data('group-id');
        $('#deviceTypeExport option[value="'+deviceModel+'"]').prop('selected',true);
        $('#deviceGroupExport option[value="'+groupId+'"]').prop('selected',true);

        $('#exportModal').modal('show');
    })
    $('#exportModalSubmit').on('click', async function () {
        var idGroup = $('#deviceGroupExport').val();
        var dateExport = $('#dateExport').val().split(' ~ ');
        var startDate = dateExport[0];
        var endDate = dateExport[1];
        var deviceModel = $('#deviceTypeExport').val();

        ExportData(idGroup, startDate, endDate, deviceModel)
    })
    //func export data

    async function ExportData(idGroup, dateStart, dateEnd, deviceModel) {
        $('#mask').show();

        var title = `Thống kê môi trường \n từ ${dateStart} đến ${dateEnd}`;
        var fileName = `Thống kê môi trường từ ${dateStart} đến ${dateEnd}`;
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
                        data[key] = value * 1;
                    }
                }
                return data;
            });
            // console.log(exportData);
            await ExportDataToFile(exportData, fileName, fileExtension, title, deviceTypes).finally(function(){
                $('#mask').hide();
            });
        } else {
            alertAction('failure', 'Không có dữ liệu để xuất');
            $('#mask').hide();
        }

    }

})