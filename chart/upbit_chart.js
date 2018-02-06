function get_coin(code, period, chart) {
  chart.mapper({
    dateFormat: '%Y-%m-%dT%H:%M:%S%Z',
    date:'candleDateTimeKst', 
    open:'openingPrice',
    high: 'highPrice',
    low: 'lowPrice',
    close: 'tradePrice',
    volume: 'candleAccTradeVolume'
  });
  chart.symbol_text(code + ' ' + period);
  
  const url = `https://crix-api-endpoint.upbit.com/v1/crix/candles/${period}?count=200&code=CRIX.UPBIT.${code}`;
  return function() {
    d3.json(url, function(error, data) {
      chart.ohlc(data)
      chart.draw();
    }); 
  }

}

function findGetParameter(parameterName) {
  var result = null,
      tmp = [];
  var items = location.search.substr(1).split("&");
  for (var index = 0; index < items.length; index++) {
      tmp = items[index].split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
  }
  return result;
}            

var code = findGetParameter('code');
var ema = findGetParameter('ema');
var ema_options = [10,30,90];
if (ema) {
  ema_options = ema.split(',').map(Number);
}

var refresh = findGetParameter('refresh');
var refresh_option = 10;
if (refresh) {
  refresh_option = refresh;
}

var period_arr = ['ticks/60', 'minutes/1', 'minutes/3', 'minutes/5', 'minutes/10', 
                'minutes/15', 'minutes/30', 'minutes/60', 'minutes/240', 'days'];
var periods = findGetParameter('periods');
if (periods) {
  period_arr = periods.split(',');
}

var charts_refresh = []
var date_format = {'ticks/60':'%H:%M:%S', 'minutes/1':'%d %H:%M', 'minutes/3':'%d %H:%M', 'minutes/5':'%d %H:%M', 
                  'minutes/10':'%d %H:%M', 'minutes/15':'%d %H:%M', 'minutes/30':'%d %H:%M', 'minutes/60':'%m/%d %H', 
                  'minutes/240':'%m/%d %H', 'days':'%y/%m/%d'};
for (var i = 0; i < period_arr.length; i++) {
  var parent = d3.select('#chart_columns').append('div').attr('class', 'column is-half-desktop').node();
  var chart = new FinanceChart(parent);
  chart.date_format(date_format[period_arr[i]])
  if (ema_options) {
    chart.ema_options(ema_options);
  }
  charts_refresh.push(get_coin(code, period_arr[i], chart));

}

function refreshData() {
  charts_refresh.forEach((f) => f());
  setTimeout(refreshData, refresh_option*1000);  
}

refreshData();