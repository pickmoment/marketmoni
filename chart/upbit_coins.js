function coin_list(limit) {
  const url = `https://crix-api-endpoint.upbit.com/v1/crix/trends/acc_trade_price_24h?includeNonactive=false&codeOnly=true`;
  d3.json(url, function(error, data) {
    codes = []
    var count = 0;
    for (i in data) {
      if (data[i].includes('KRW')) {
        code = data[i].split('.')[2];
        codes.push(code);
        count++;
        if (limit && limit <= count) {
          break;
        }
      }
    }
    display_coins(codes);
  }); 
}

function display_coins(codes) {
  var charts_refresh = [];
  for (var i = 0; i < codes.length; i++) {
    var parent = d3.select('#chart_columns').append('div').attr('class', 'column is-one-third-desktop').node();
    var chart = new FinanceChart(parent);
    chart.click_link(`upbit_chart.html?code=${codes[i]}`);
    charts_refresh.push(get_coin(codes[i], period_option, chart));
  }
  
  function refreshData() {
    charts_refresh.forEach((f) => f());
    setTimeout(refreshData, refresh_option*1000);  
  }
  
  refreshData();
}

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

var ema = findGetParameter('ema');
var ema_options = [10,30,90];
if (ema) {
  ema_options = ema.split(',').map(Number);
}

var period = findGetParameter('period');
var period_option = 'ticks/60';
if (period) {
  period_option = period;
}

var refresh = findGetParameter('refresh');
var refresh_option = 10;
if (refresh) {
  refresh_option = refresh;
}

var coins = findGetParameter('coins');
if (coins) {
  var coin_arr = coins.split(',')
  display_coins(coin_arr);
} else {
  var limit = findGetParameter('limit');
  coin_list(limit);
}

