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
    // var parent = d3.select('#chart_columns').append('div').attr('class', 'column is-half-desktop').node();
    var chart = new FinanceChart(parent);
    chart.click_link(`upbit_chart.html?code=${codes[i]}`);
    chart.tick_count(100)
    charts_refresh.push(get_coin(codes[i], period_option, chart));
  }
  
  function refreshData() {
    charts_refresh.forEach((f) => f());
    setTimeout(refreshData, refresh_option*1000);  
  }
  
  refreshData();
}

function get_coin(code, period, chart) {
  var data_dict = {}

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
  chart.data_callback(data_callback)
  
  var count = 200
  return function() {
    const url = `https://crix-api-endpoint.upbit.com/v1/crix/candles/${period}?count=${count}&code=CRIX.UPBIT.${code}`;
    d3.json(url, function(error, data) {
      count = 2
      if (ema_options) {
        chart.ema_options(ema_options);
      }
      var f_data = filtered_data(data, data_dict) 
      // console.log(f_data)
      chart.ohlc(f_data)
      chart.draw();
    }); 
  }

  function filtered_data(data, data_dict) {
    var result = []
    for (var i = 0; i < data.length; i++) {
      data_dict[data[i].candleDateTimeKst] = data[i]
    }
    var keys = Object.keys(data_dict).sort((a, b) => {
      if (b > a) return 1
      else if (b < a) return -1
      else return 0
    })
    for (i = 0; i < keys.length; i++) {
      if (i < 500) {
        result.push(data_dict[keys[i]])
      } else {
        delete data_dict[keys[i]]
      }

    }
    return result
  }

}

function data_callback(data) {
  // console.log(data)

  low_peaks = []
  high_peaks = []
  size_2_ticks = []
  for (var i = 0; i < data.ohlc.length; i++) {
    if (i > 0 && i < data.ohlc.length) {
      const prev = data.ohlc[i-1]
      const curr = data.ohlc[i]
      const next = data.ohlc[i+1]

      size_2(prev, curr, next, size_2_ticks)
      peak(i, data.ohlc, low_peaks, high_peaks)
    }
    // if (i == data.ohlc.length-1) {
    //   console.log('Last:', data.ohlc[i])
    // }
  }

  // console.log(size_2_ticks)

  // for (var i = 0; i < data.ohlc.length; i++) {
    // var i = data.ohlc.length-1
    // analyse(i, data.ohlc, data.ichimoku, low_peaks, high_peaks, size_2_ticks, data)
  // }  
  // analyse(data.ohlc.length -1, data.ohlc, low_peaks, high_peaks, size_2_ticks)

  // console.log('Low Peaks:', low_peaks)
  // console.log('High Peaks', high_peaks)
  // console.log('Size2 Ticks:', size_2_ticks)
}

function first_prev(curr, peaks) {
  for (var i = peaks.length-1; i >= 0; i--) {
    if (curr.date > peaks[i].date) {
      return peaks[i]
    }
  }
}

function is_in(curr, ticks) {
  for (var i = ticks.length-1; i >= 0; i--) {
    if (curr.date === ticks[i].date) {
      return true
    }
  }
}

function analyse(index, ohlc, ichimoku, low_peaks, high_peaks, size_2_ticks, data) {
  const range = 3
  const i = index

  if (i < range) {
    return
  }

  const prevs = ohlc.slice(i-range, i)
  const low = Math.min(...prevs.map((d)=>d.low))
  const high = Math.max(...prevs.map((d)=>d.high))
  const curr = ohlc[i]

  var anals = []
  
  if (is_in(curr, size_2_ticks)) {
    anals.push('기준점')
  }

  if (curr.low < low) {
    anals.push('하락')
  }

  if (curr.high > high) {
    anals.push('상승')
  }

  const first_prev_low_peak = first_prev(curr, low_peaks)
  const first_prev_high_peak = first_prev(curr, high_peaks)
  // console.log(first_prev_low_peak, first_prev_high_peak)

  if (first_prev_low_peak && curr.low > first_prev_low_peak.low) {
    anals.push('단기저점 위')
  }

  if (first_prev_high_peak && curr.high > first_prev_high_peak.high) {
    anals.push('단기고점 위')
  }

  if (first_prev_low_peak && curr.low < first_prev_low_peak.low) {
    anals.push('단기저점 밑')
  }

  if (first_prev_high_peak && curr.high < first_prev_high_peak.high) {
    anals.push('단기고점 밑')
  }

  if (ichimoku[index].kijunSen) {
    if (curr.low > ichimoku[index].kijunSen) {
      anals.push('기준선 위')
    } else {
      anals.push("기준선 밑")
    }
  }

  if (anals.length > 0 && anals.includes('기준점')) {
    console.log(data.symbol, curr, anals)
  }
}

function size_2(prev, curr, next, size_2_ticks) {
  if (prev.volume * 2 < curr.volume) {
    const prevHeight = prev.close - prev.open
    const currHeight = curr.close - curr.open
    const prevHeightAbs = Math.abs(prevHeight)
    const currHeightAbs = Math.abs(currHeight)
    // if (prevHeightAbs * 2 < currHeightAbs) {
    const heightPercent = currHeightAbs / curr.low
    if (heightPercent > 0.005 || prevHeightAbs * 2 < currHeightAbs) {
      size_2_ticks.push(curr)
    }
    // }
  }
}

function peak(i, ohlc, low_peaks, high_peaks) {
  const range = 8
  if (i < range) {
    return
  }
  const curr = ohlc[i]
  const prevs = ohlc.slice(i-range, i)
  const nexts = ohlc.slice(i+1, i+1+range)
  const neighbors = prevs.concat(nexts)
  const low = Math.min(...neighbors.map((d)=>d.low))
  const high = Math.max(...neighbors.map((d)=>d.high))
  if (curr.high > high) {
    high_peaks.push(curr)
  }
  if (curr.low < low) {
    low_peaks.push(curr)
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
var ema_options = [20,60,112,224];
if (ema) {
  ema_options = ema.split(',').map(Number);
  console.log('ema', ema)
}

var period = findGetParameter('period');
var period_option = 'minutes/10';
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

