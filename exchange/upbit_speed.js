Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(value).format('YYYY/MM/DD HH:mm:ss')
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

Vue.component('coin-board', {
  props: ['coins'],
  template: `
    <div class="row">
    <div class="col s12 m9 l6">
    <table class="bordered">
    <thead>
      <tr>
        <th class="right-align">
          <div>코인</div>
        </th>
        <th class="right-align">
          <div>프리미엄</div>
          <div>현재가</div>
        </th>
        <th class="right-align">
          <div>1일 %</div>
          <div>최소 %</div>
        </th>
        <th class="right-align">
          <div>중간 %</div>
          <div>최대 %</div>
        </th>
        <th class="right-align">
          <div>초당Tick</div>
          <div>Bid율</div>
        </th>
        <th class="right-align">
          <div>초당Volume</div>
          <div>시작시간</div>
        </th>
      </tr>
    </thead>
    <tbody>
      <coin-view 
        v-for="coin in coins"
        v-bind:coin="coin"
        v-bind:key="coin.symbol">
      </coin-view>
    </tbody>
  </table>
  </div>
  </div>
`        
})

Vue.component('coin-view', {
  props: ['coin'],
  template: `
    <tr>
      <td class="right-align">
        <div>{{coin.symbol}}</div> 
        <div><a v-bind:href="coin.coinmarketcap_link" target="_blank">{{coin.name}}</a></div>
      </td>
      <td class="right-align">
        <div>{{coin.premium | currency}}</div>
        <div>{{coin.price | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.chnage_1d | currency}}</div>
        <div>{{coin.change_min | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.change_median | currency}}</div>
        <div>{{coin.change_max | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.speed | currency}}</div>
        <div>{{coin.bidrate | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.volume_speed | currency}}</div>
        <div>{{coin.start_timestamp | formatDate}}</div>
      </td>
    </tr> 
  `        
})

TICK_COUNT = 1000

symbol_map = {
  'BCC': 'BCH'
}

findSymbol = function(symbol) {
  if (symbol in symbol_map) {
    return symbol_map[symbol]
  }
  return symbol
}

var app = new Vue({
  el: '#app',
  data() {
    return {
      coinCodes: [],
      coinList: [],
      updateTime: '',
      timer: '',
      timer_coinmarketcap: '',
      data_coin: {},
      data_coinmarketcap: {},
      filter_name: ''
    }
  },
  created: function() {
    this.fetchCoinList()
  },
  methods: {
    fetchCoinList() {
      this.$http.get('https://crix-api-endpoint.upbit.com/v1/crix/trends/acc_trade_price_24h?includeNonactive=false&codeOnly=true').then(res => {
        codes = res.body
        for (i in codes) {
          code = codes[i]
          code_part = code.split('.')
          code_part = code_part[2].split('-')
          market = code_part[0]
          symbol = code_part[1]
          
          if (market === 'KRW') {
            this.coinCodes.push(symbol)
          }
        }

        this.fetchCoinMarketCap();
        this.timer_coinmarketcap = setInterval(this.fetchCoinMarketCap, 240000)
            
        this.fetchCoinTicks()
        this.timer = setInterval(this.fetchCoinTicks, 10000)
      
      }, err => {
        console.log(err)
      })
    },

    fetchCoinTicks() {
      // coins = ['SNT','XLM','BTC','XRP','ADA','STEEM','QTUM','POWR','ETH','BCC','EMC2','MER']
      // coins = ['SNT']
      // console.log('tick', this.coinCodes)
      for (i in this.coinCodes) {
        coin = this.coinCodes[i]
        this.$http.get(`https://crix-api-endpoint.upbit.com/v1/crix/trades/ticks?code=CRIX.UPBIT.KRW-${coin}&count=${TICK_COUNT}`).then(res => {
        // this.data_coin.length = 0
        tickers = res.body
        // tick_list = []
        // console.log(data_coinmarketcap)
        if (tickers && tickers.length > 0) {
          let ticker = tickers[0]
          let code_part = ticker.code.split('.')
          code_part = code_part[2].split('-')
          let market = code_part[0]
          let symbol = code_part[1]

          ticker.coin_name = ''
          ticker.premium = 'N/A'
          ticker.coinmarketcap_link = ''

          if (market === 'KRW') {
            coinmarket = this.data_coinmarketcap[findSymbol(symbol)]
            if (coinmarket) {
              ticker.coin_name = coinmarket.name
              coin_name_code = ticker.coin_name.replace(' ', '-')
              coin_name_code = coin_name_code.toLowerCase()
              ticker.premium = ((ticker.tradePrice / coinmarket.price - 1) * 100).toFixed(2)
              ticker.coinmarketcap_link = `https://coinmarketcap.com/currencies/${coin_name_code}/#markets`
            }
            ticker.seconds = ((ticker.tradeTimestamp - tickers[tickers.length-1].tradeTimestamp) / 1000)
            ticker.speed = (TICK_COUNT / ticker.seconds).toFixed(2)
            ticker.bidrate = (tickers.filter(t => t.askBid === 'BID').length / TICK_COUNT * 100).toFixed(2)

            let tradePrices = tickers.slice(1).map(t => t.tradePrice)
            tradePrices.sort((a, b) => a - b)
            // let sum_tradePrice = tradePrices.reduce((previous, current) => current += previous);
            // let avg_tradePrice = sum_tradePrice / tradePrices.length
            ticker.median_tradePrice = (tradePrices[(tradePrices.length - 1) >> 1] + tradePrices[tradePrices.length >> 1]) / 2
            ticker.max_tradePrice = tradePrices[tradePrices.length-1]
            ticker.min_tradePrice = tradePrices[0]

            // let avg_change = ((ticker.tradePrice / avg_tradePrice - 1) * 100).toFixed(2)
            ticker.change_median = ((ticker.tradePrice / ticker.median_tradePrice - 1) * 100).toFixed(2)
            ticker.change_max = ((ticker.tradePrice / ticker.max_tradePrice - 1) * 100).toFixed(2)
            ticker.change_min = ((ticker.tradePrice / ticker.min_tradePrice - 1) * 100).toFixed(2)
            // let change_1d = (Number(ticker.signedChangeRate) * 100).toFixed(2)
            ticker.change_1d = ((ticker.tradePrice / ticker.prevClosingPrice - 1) * 100).toFixed(2)

            ticker.tradeVolumes = tickers.map(t => t.tradeVolume).reduce((a, b) => b += a)
            ticker.volume_speed = (ticker.tradeVolumes / ticker.seconds).toFixed(5)

            // console.log(symbol, ticker.coin_name, ticker.premium, ticker.tradePrice, 
            //   ticker.change_1d, ticker.change_min, ticker.change_median, ticker.change_max, 
            //   tickers.length, ticker.seconds, ticker.speed, ticker.bidrate, ticker.volume_speed)

            new_data = {
              symbol: symbol,
              name: ticker.coin_name,
              premium: ticker.premium,
              price: ticker.tradePrice,
              chnage_1d: ticker.change_1d,
              change_min: ticker.change_min,
              change_median: ticker.change_median,
              change_max: ticker.change_max,
              speed: ticker.speed,
              bidrate: ticker.bidrate,
              volume_speed: ticker.volume_speed,
              seconds: ticker.seconds,
              count: tickers.length,
              timestamp: ticker.tradeTimestamp,
              start_timestamp: tickers[tickers.length-1].tradeTimestamp,
              coinmarketcap_link: ticker.coinmarketcap_link
            }
            
            this.data_coin[symbol] = new_data
          }
        }
        this.displayCoinData()
      }, err => {
        console.log(err)
      })
    }
      
    },

    fetchCoinMarketCap() {
      this.$http.get('https://api.coinmarketcap.com/v1/ticker/?convert=KRW&limit=300').then(res => {
        tickers = res.body

        this.data_coinmarketcap = {}

        for (i in tickers) {
          ticker = tickers[i]
          this.data_coinmarketcap[ticker.symbol] = {
            symbol: ticker.symbol,
            name: ticker.name,
            price: Math.round(ticker.price_krw),
            volume: Math.round(ticker['24h_volume_krw'] / 100000000),
            market_cap: Math.round(ticker.market_cap_krw / 100000000),
            market_supply: (ticker.available_supply / 100000000).toFixed(3),
            change_1h: ticker.percent_change_1h,
            change_1d: ticker.percent_change_24h,
            change_7d: ticker.percent_change_7d
          }
        }

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
        coinName = this.data_coin[key].name.toUpperCase()

        if (key.search(filterName) >= 0
            || coinName.search(filterName) >=0) {
          this.coinList.push(this.data_coin[key])
        }
      }
      // console.log(this.coinList)
      if (this.coinList[0]) {
        this.updateTime = this.coinList[0].timestamp
      }
    }
  },
  beforeDestroy() {
    clearInterval(this.timer)
    clearInterval(this.timer_coinmarketcap)
  }

})
