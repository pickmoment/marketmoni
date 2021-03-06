Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(value).format('YYYY/MM/DD HH:mm:ss')
  }
})

Vue.filter('formatDay', function(value) {
  if (value) {
    return moment(value).format('MM/DD HH:mm:ss')
  }
})

Vue.filter('formatTime', function(value) {
  if (value) {
    return moment(value).format('HH:mm:ss')
  }
})

Vue.filter('formatElapseTime', function(seconds) {
  if (seconds) {
    let second = seconds % 60
    let minute = Math.floor(seconds / 60) % 60
    let hour = Math.floor(seconds / 60 / 60)
    return `${hour}:${minute}:${second}`
  }
})


Vue.filter('currency', function(value) {
  if (value) {
    parts = value.toString().split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join('.');
  }
  return ''
})

Vue.component('coin-board', {
  props: ['coins', 'coin_localdb'],
  template: `
    <div class="row">
    <div class="col s12 m9 l6">
    <table class="bordered">
    <thead>
      <tr>
        <th class="right-align">
          <div>코인</div>
          <div>단가/수량</div>
        </th>
        <th class="right-align">
          <div>프리미엄</div>
          <div>현재가</div>
          <div>수익%</div>
        </th>
        <th class="right-align">
          <div>1일%</div>
          <div>최소%</div>
          <div>수익(원)</div>
        </th>
        <th class="right-align">
          <div>최대%</div>
          <div>중간%</div>
        </th>
        <th class="right-align">
          <div>Tick/s</div>
          <div>Bid%</div>
        </th>
        <th class="right-align">
          <div>Volume/s</div>
          <div>만원/s</div>
          <div>시총(억원)</div>
        </th>
      </tr>
    </thead>
    <tbody>
      <coin-view 
        v-for="coin in coins"
        v-bind:coin="coin"
        v-bind:key="coin.symbol"
        v-bind:coin_work="coin_localdb[coin.symbol].work">
      </coin-view>
    </tbody>
  </table>
  </div>
  </div>
`        
})

Vue.use('vue-numeric')

Vue.component('coin-view', {
  props: ['coin', 'coin_work'],
  template: `
    <tr>
      <td class="right-align">
        <div><span class="update-time">({{coin.seconds | formatElapseTime}})</span> <span>{{coin.symbol}}</span></div> 
        <div><a v-bind:href="coin.coinmarketcap_link" target="_blank">{{coin.name}}</a></div>
        <div><input type="text" class="browser-default right-align input-buy-price" size="10" v-model.trim="coin_work.buy" @change="saveBuy" /></div> 
      </td>
      <td class="right-align">
        <div>{{coin.premium | currency}}</div>
        <div>{{coin.price | currency}}</div>
        <div>{{coin.earn_rate | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.chnage_1d | currency}}</div>
        <div>{{coin.change_min | currency}}</div>
        <div>{{coin.earn_volume | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.change_max | currency}}</div>
        <div>{{coin.change_median | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.speed | currency}}</div>
        <div>{{coin.bidrate | currency}}</div>
      </td>
      <td class="right-align">
        <div>{{coin.volume_speed | currency}}</div>
        <div>{{coin.money_speed | currency}}</div>
        <div>{{coin.market_cap | currency}}</div>
      </td>
    </tr> 
    `,
  methods: {
    saveBuy(e) {
      localStorage.setItem(`upbit.krw.${this.coin.symbol}`, this.coin_work.buy)
    },
  }
})

TICK_COUNT = 100

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
      filter_name: '',
      coin_localdb: {}
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
            this.coin_localdb[symbol] = {
              work: {
                buy: localStorage.getItem(`upbit.krw.${symbol}`)
              }
            }
          }
        }
        this.fetchCoinMarketCap();
        this.timer_coinmarketcap = setInterval(this.fetchCoinMarketCap, 300000)
            
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
              ticker.market_cap = coinmarket.market_cap
            }
            ticker.seconds = ((ticker.tradeTimestamp - tickers[tickers.length-1].tradeTimestamp) / 1000).toFixed(0)
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
            ticker.money_speed = (((ticker.tradeVolumes / ticker.seconds) * ticker.tradePrice) / 10000).toFixed(0)

            // console.log(symbol, ticker.coin_name, ticker.premium, ticker.tradePrice, 
            //   ticker.change_1d, ticker.change_min, ticker.change_median, ticker.change_max, 
            //   tickers.length, ticker.seconds, ticker.speed, ticker.bidrate, ticker.volume_speed)
            let buy = this.coin_localdb[symbol].work.buy
            if (buy) {
              buy_parts = buy.split('/')
              buy_price = Number(buy_parts[0])
              buy_amount = buy_parts[1] ? Number(buy_parts[1]) : undefined
              ticker.earn_rate = ((ticker.tradePrice / buy_price - 1) * 100).toFixed(2)
              if (buy_amount) {
                ticker.earn_volume = Math.floor((ticker.tradePrice - buy_price) * buy_amount * 0.95)
              }
              // console.log(symbol, buy, buy_price, buy_amount, ticker.earn_rate, ticker.earn_volume)
            }

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
              money_speed: ticker.money_speed,
              seconds: ticker.seconds,
              count: tickers.length,
              timestamp: ticker.tradeTimestamp,
              start_timestamp: tickers[tickers.length-1].tradeTimestamp,
              coinmarketcap_link: ticker.coinmarketcap_link,
              earn_rate: ticker.earn_rate,
              earn_volume: ticker.earn_volume,
              market_cap: ticker.market_cap
            }
            
            // console.log(new_data)

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
      coins = []
      for (key in this.data_coin) {
        filterName = this.filter_name.toUpperCase()
        coinName = this.data_coin[key].name.toUpperCase()

        if (key.search(filterName) >= 0
            || coinName.search(filterName) >=0) {
          coins.push(this.data_coin[key])
        }
      }

      this.coinList = coins.sort((a,b) => {
        num1 = Number(a.money_speed)
        num2 = Number(b.money_speed)
        if (num1 < num2) {
          return 1;
        } else if (num1 > num2) {
          return -1;
        } else {
          return 0
        }
      })

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

