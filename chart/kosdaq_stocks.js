const PERIODS = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];
console.log('periods:', PERIODS);

const stocks_url = `http://stock.kakao.com/api/trends/ordered_stocks.json?key=top_rate_of_rise&market=kosdaq&limit=100`;


function coin_list(limit) {
  d3.json(stocks_url, function(error, data) {
    var nextCursor = data.nextCursor;
    data = data.stocks;
    codes = data.map((d) => {
      return {
        name: d.name,
        shortCode: d.shortCode,
        code: d.code
      }
    });
    var count = 0;
    next_coin_list(nextCursor, codes);
    // for (var i = 0; i < data.length; i++) {
    //   var symbol = data[i].symbol;
    //   var currency = symbol.substr(symbol.length-3);
    //   var coin = symbol.substr(0, symbol.length-3)
    //   if (['ETH'].includes(currency)) {
    //     codes.push(symbol)
    //   }
    // }
    // display_coins(codes.slice(0,12));
  }); 
}

function next_coin_list(nextCursor, codes) {
  if (nextCursor) {
    d3.json(`${stocks_url}&cursor=${nextCursor}`, function(error, data) {
      var nextCursor = data.nextCursor;
      data = data.stocks;
      codes = codes.concat(data.map((d) => {
        return {
          name: d.name,
          shortCode: d.shortCode,
          code: d.code
        }
      }));

      next_coin_list(nextCursor, codes);
    });
    
  } else {
    console.log('stocks:', codes);
  }
}

function display_coins(codes) {
  var charts_refresh = [];
  for (var i = 0; i < codes.length; i++) {
    var parent = d3.select('#chart_columns').append('div').attr('class', 'column is-one-third-desktop').node();
    var chart = new FinanceChart(parent);
    if (ema_options) {
      chart.ema_options(ema_options);
    }
    chart.click_link(`binance_chart.html?code=${codes[i]}`);
    charts_refresh.push(get_coin(codes[i], period_option, chart));
  }
  
  function refreshData() {
    charts_refresh.forEach((f) => f());
    setTimeout(refreshData, refresh_option*1000);  
  }
  
  refreshData();
}

function get_coin(code, period, chart) {  
  chart.symbol_text(code + ' ' + period);
    
  const url = `https://api.binance.com/api/v1/klines?symbol=${code}&interval=${period}`;
  return function() {
    d3.json(url, function(error, data) {
      data = data.map(function(d) {
        return {
          date: d[0],
          open: d[1],
          high: d[2],
          low: d[3],
          close: d[4],
          volume: d[5]
        }
      })
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
  ema_options = ema.split(',').map(Number)
}

var period = findGetParameter('period');
var period_option = '5m';
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

