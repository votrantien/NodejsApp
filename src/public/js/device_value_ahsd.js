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
        var startDate = String(today.getFullYear()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + ' ' + '00:00';
        var endDate = String(today.getFullYear()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + ' ' + '23:59';
        this.value = startDate + ' ~ ' + endDate;
        var chartId = $(this).attr('chart-id');
        var devGroup = $(this).parents('.tab-content').attr('id');

        var options = {
            startOfWeek: 'monday',
            separator: ' ~ ',
            maxDays: 2,
            minDays: 1,
            format: 'YYYY-MM-DD HH:mm',
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
            $(`#tab-${data}`).removeClass('status-1 status-2 status-0');
            $(`#tab-${data}`).addClass('status-1');
            socket.emit('start_real_time_device', { listDevices, user });
        }
    })

    //on realtime value

    socket.on('realtime_device_value', function (data) {
        // value = {serial: ..., value: {...}}
        // console.log(data);
        var serial = data.serial;
        for (const [key, value] of Object.entries(data.data.val)) {
            var idxValue = key;
            var idValueType = 'val-' + serial + '-' + idxValue;
            if(!$(`#tab-${serial}`).hasClass('status-1')){
                $(`#tab-${serial}`).removeClass('status-1 status-2 status-0');
                $(`#tab-${serial}`).addClass('status-1');
            }
            $(`#${idValueType} .device-item-value .value`).html(value);
        }
        //console.log(deviceSn, value)
    });

    //check device disconnect
    socket.on('device_disconnect', function (data) {
        if (String(data).slice(0, 4) == 'AHSD') {
            $(`#tab-${data}`).removeClass('status-1 status-2 status-0');
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
        var chartId = `chart-${serial}`;
        var chart = Chart.getChart(chartId);
        var uomValue = $(this).attr('uom');
        var color = Colors[$(this).attr('color-idx')];
        var dpValue = $(`#date-picker-${serial}`).val().split(' ~ ');
        var startDate = dpValue[0];
        var endDate = dpValue[1];
        var chartTitle = String(`${valueName} ( ${uomValue} ) - Từ ${startDate} đến ${endDate}`).toUpperCase();

        var onChart = $(this).attr('on-chart');

        if (onChart == 'true') {
            $(this).attr('on-chart', 'false');
            $(this).removeClass('on-chart');
            if (chart) {
                chart.destroy();
            }
            $(`#dev-${serial} .chart-title`).show();
        } else {
            $(`#uom-key-${serial}`).val(keyValue);
            var chartData = await PrepareChartData(serial, startDate, endDate);
            console.log(chartData);
            var dataset = {
                id: serial,
                label: valueName,
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
                    console.log(keyValue)
                    var value = log.device_value[keyValue];
                    var data = { x: log.createdAt, y: value * 1 }
                    dataset.data.push(data);
                });
            }
            if (!chart) {
                $(`#dev-${serial} .chart-title`).hide();
                RenderChart(chartId, dataset, chartTitle);
            } else {
                chart.data.datasets = [dataset];
                chart.options.plugins.title.text = chartTitle;
                chart.update();
                ScrollToElement(chartId);
            }
            $(`#dev-${serial} .device-item`).removeClass('on-chart');
            $(`#dev-${serial} .device-item`).attr('on-chart', 'false');
            $(this).addClass('on-chart');
            $(this).attr('on-chart', 'true');
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
                                displayFormats: {
                                    quarter: 'dd/MM HH:mm'
                                }
                            },
                            ticks: {
                                color: "#fff"
                            },
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: "#fff"
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

    //refresh chart
    async function RefreshChart(chartId, devGroup) {
        var chart = Chart.getChart(chartId);
        if (!chart) {
            return;
        }
        $('#mask').show();

        var onChartItem = $(`#${devGroup} .device-item[on-chart*="true"]`);
        var serial = $(onChartItem).attr('device-sn');
        var valueName = $(onChartItem).attr('value-name');
        var keyValue = $(onChartItem).attr('key-value');
        var uomValue = $(onChartItem).attr('uom');
        var color = Colors[$(onChartItem).attr('color-idx')];
        var dpValue = $(`#date-picker-${serial}`).val().split(' ~ ');
        var startDate = dpValue[0];
        var endDate = dpValue[1];
        var chartTitle = String(`${valueName} ( ${uomValue} ) - Từ ${startDate} đến ${endDate}`).toUpperCase();

        var onChart = $(this).data('on-chart');


        $(`#uom-key-${serial}`).val(keyValue);
        var chartData = await PrepareChartData(serial, startDate, endDate);

        var dataset = {
            id: serial,
            label: valueName,
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
                var value = log.device_value[keyValue];
                var data = { x: log.createdAt, y: value * 1 }
                dataset.data.push(data);
            });
        }
        if (!chart) {
            $(`#dev-${serial} .chart-title`).hide();
            RenderChart(chartId, dataset, chartTitle);
        } else {
            chart.data.datasets = [dataset];
            chart.options.plugins.title.text = chartTitle;
            chart.update();
            ScrollToElement(chartId);
        }
        //console.log(datasets);
        $('#mask').hide();
    }

    //Quick time controll
    $(document).on('click', '.quick-time-item', function () {
        var devGroup = $(this).parents('.tab-content').attr('id');
        var chartId = $(`#${devGroup} .chart-canvas`).attr('id');
        var startTime = $(this).attr('start-time');
        var endTime = $(this).attr('end-time');
        var currentDate = $(`#${devGroup} .date-picker`).val().split(" ~ ");
        var startDate = currentDate[0].slice(0, 11) + startTime;
        var endDate = currentDate[1].slice(0, 11) + endTime;
        var newDate = startDate + ' ~ ' + endDate;

        $(`#${devGroup} .quick-time-item`).removeClass('high-light-box');
        $(this).addClass('high-light-box');

        $(`#${devGroup} .date-picker`).val(newDate);


        RefreshChart(chartId, devGroup);
    })
})