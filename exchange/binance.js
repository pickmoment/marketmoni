Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(value).format('YYYY/MM/DD HH:mm')
  }
})

Vue.filter('currency', function(value) {
  if (value) {
    parts = value.toString().split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join('.');
  }
  return 'N/A'
})

Vue.component('coin-view', {
  props: ['coin'],
  template: `
    <div class="col s6 m3 l2">
      <div class="card">
        <div class="card-content">
          <span class="card-title" v-bind:title="coin.name">
            {{coin.symbol}} <span class="card-title-desc">{{coin.name}}</span>
          </span>
          <div class="row">
            <index-view title="전종가" v-bind:index="coin.prev_price" unit="BTC" wide="s6"/>
            <index-view title="시가" v-bind:index="coin.open_price" unit="BTC" wide="s6"/>
            <index-view title="현재가" v-bind:index="coin.last_price" unit="BTC" wide="s6"/>
            <index-view title="가중평균" v-bind:index="coin.avg_price" unit="BTC" wide="s6"/>
            <index-view title="저가" v-bind:index="coin.low_price" unit="BTC" wide="s6"/>
            <index-view title="고가" v-bind:index="coin.high_price" unit="BTC" wide="s6"/>
            <index-view title="거래량" v-bind:index="coin.volume" unit="BTC" wide="s6"/>
            <index-view title="1일" v-bind:index="coin.change" unit="%" wide="s4"/>
          </div>
        </div>            
        <div class="card-action">
          <a v-bind:href="coin.coinmarketcap_link" target="_blank">Global</a>
        </div>
      </div>
    </div>  
  `        
})

Vue.component('index-view', {
  props: ['title', 'index', 'unit', 'wide'],
  template: `
    <div v-bind:class="['col', wide, 'index']">
      <div class="index-title">{{title}} ({{unit}})</div>
      <span>{{index | currency}} </span>
    </span>
  `
})

DATA_MAX = 200

findSymbol = function(symbol) {
  mapping = {
    'IOTA': 'MIOTA', 
    'YOYO': 'YOYOW',
    'BQX': 'BQ',
    'OST': 'ST'
  }
  if (symbol in mapping) {
    return mapping[symbol]
  }
  return symbol
}

var app = new Vue({
  el: '#app',
  data() {
    return {
      coinList: [],
      updateTime: '',
      timer: '',
      timer_coinmarketcap: '',
      data_coin: {},
      data_coinmarketcap: '',
      filter_name: ''
    }
  },
  created: function() {
    this.fetchCoinMarketCap();
    this.timer = setInterval(this.fetchCoinList, 20000)
    this.timer_coinmarketcap = setInterval(this.fetchCoinMarketCap, 240000)
  },
  methods: {
    fetchCoinList() {
      this.$http.get('https://api.binance.com/api/v1/ticker/24hr').then(res => {
        // this.data_coin.length = 0
        tickers = res.body
        // tick_list = []
        // console.log(data_coinmarketcap)
        for (i in tickers) {
          ticker = tickers[i]
          currency_market = ticker.symbol
          symbol = currency_market.substring(0, currency_market.length-3)
          market = currency_market.substring(currency_market.length-3)

          if (market === 'BTC') {
            if (findSymbol(symbol) in this.data_coinmarketcap) {
              coin_name = this.data_coinmarketcap[findSymbol(symbol)].name
              coin_name_code = coin_name.replace(' ', '-')
              coin_name_code = coin_name_code.toLowerCase()
              // console.log(data_coinmarketcap[findSymbol(symbol)])
              ticker.coinmarketcap_link = `https://coinmarketcap.com/currencies/${coin_name_code}/#markets`
            } else {
              coin_name = ''
            }
            // tick_list.push(ticker)
            // console.log(ticker)

            new_data = {
              symbol: symbol,
              name: coin_name,
              prev_price: ticker.prevClosePrice,
              avg_price: ticker.weightedAvgPrice,
              open_price: ticker.openPrice,
              last_price: ticker.lastPrice,
              high_price: ticker.highPrice,
              low_price: ticker.lowPrice,
              open_time: ticker.openTime,
              close_time: ticker.closeTime,
              volume: Number(ticker.quoteVolume).toFixed(2),
              change: (((ticker.lastPrice / ticker.prevClosePrice) - 1) * 100).toFixed(2),
              coinmarketcap_link: ticker.coinmarketcap_link
            }
            
            if (!(symbol in this.data_coin)) {
              this.data_coin[symbol] = [new_data]
            } else {
              d = this.data_coin[symbol]
              last_data = d[d.length-1]
              // console.log(last_data)
              if (last_data.timestamp !== new_data.timestamp) {
                if (d.length >= 5) {
                  new_data.change_5 = ((new_data.price / d[4].price - 1) * 100).toFixed(2)
                }
                if (d.length >= 15) {
                  new_data.change_15 = ((new_data.price / d[14].price - 1) * 100).toFixed(2)
                }
                if (d.length >= 30) {
                  new_data.change_30 = ((new_data.price / d[29].price - 1) * 100).toFixed(2)
                }
                if (d.length >= 60) {
                  new_data.change_60 = ((new_data.price / d[59].price - 1) * 100).toFixed(2)
                }
                if (d.length >= 120) {
                  new_data.change_120 = ((new_data.price / d[119].price - 1) * 100).toFixed(2)
                }
                if (d.length === DATA_MAX) {
                  d.shift()
                }
                d.push(new_data)
              }
            }
          }
        }
        this.displayCoinData()
      }, err => {
        console.log(err)
      })
      
      
    },

    fetchCoinMarketCap() {
      this.$http.get('https://files.coinmarketcap.com/generated/search/quick_search.json').then(res => {
        tickers = res.body
        this.data_coinmarketcap = TAFFY(tickers)

        console.log(this.data_coinmarketcap({}))
        // console.log(tickers)
        // for (i in tickers) {
        //   ticker = tickers[i]
        //   this.data_coinmarketcap[ticker.symbol] = {
        //     symbol: ticker.symbol,
        //     name: ticker.name
        //   }
        // }
        // console.log(this.data_coinmarketcap)
        this.fetchCoinList()
      }, err => {
        console.log(err)
      })

    },

    cancelAutoUpdate() { 
      clearInterval(this.timer) 
      clearInterval(this.timer_coinmarketcap)
    },

    filterCoin(e) {
      this.filter_name = e.target.value
      this.displayCoinData();
      
    },

    displayCoinData() {
      this.coinList = []
      for (key in this.data_coin) {
        filterName = this.filter_name.toUpperCase()
        coinName = this.data_coin[key][0].name.toUpperCase()

        if (key.search(filterName) >= 0
            || coinName.search(filterName) >=0) {
          d = this.data_coin[key]
          // console.log(d)
          this.coinList.push(d[d.length-1])
        }
      }
      // console.log(this.coinList)
      if (this.coinList[0]) {
        this.updateTime = this.coinList[0].close_time
      }
    }
  },
  beforeDestroy() {
    clearInterval(this.timer)
    clearInterval(this.timer_coinmarketcap)
  }

})
