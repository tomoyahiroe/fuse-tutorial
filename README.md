# フロントエンドのみで実装する検索機能について

1. 純粋な部分一致検索

TypeScript の標準的な機能を使用して実装可能です.

2. 英語の大文字小文字をあいまい検索

fuse.js というライブラリを使用して実装可能です.

3. 全角・半角を曖昧検索

例えば, **ｇｄｐ** というように英数字が全角の場合, fuse.js では上手く検索できませんでした.

そこで, 英数字の場合は半角に, 日本語の場合は全角に変換してから検索をかける方法をとりたいと考えています.

- 半角カナ対応完了

## 内部的に tag 検索を使用する必要性について

あいまい検索ライブラリとして `fuse.js` を使用することを前提として, 内部的に tag 情報を持つことで検索性能に違いが出るかを検証します. 具体的には, タイトルから名刺だけを抽出して tag 情報として保存したときに, 検索結果に違いが生じるのか検証します.

### 1. テスト用データのうち, title と titleEnglish を生成

まず, 統計ダッシュボードから系列コードを10個ほど取得して, 前回のタスクで書いた get_title() からタイトルを生成します. それを google 翻訳で英語化して titleEnglish に該当するデータを生成します.

```
[
  {
    "title": "（季節調整値）国内総生産（支出側）（名目）2015年基準, 単位: 10億円",
    "titleEnglish": "(Seasonally adjusted value) Gross domestic product (expenditure side) (nominal) 2015 base, unit: billion yen",
  },
  ...
]
```
### 2. 生成した title と titleEnglish を形態素解析し,  tags を生成
1. ライブラリのインストール
```
!pip install mecab-python3
!pip install unidic-lite
```
2. ライブラリのインポート
```
import MeCab
import json
```
3. MeCab を使用して形態素解析
```
# data をjsonとして扱う
json_data = json.dumps(data)
obj = data[9]
mecab = MeCab.Tagger("-Owakati")
title = obj["title"].replace("（", "").replace("）", "").replace(",", "").replace("(", "").replace(")", "").replace(":", "")
titleEnglish = obj["titleEnglish"].replace("（", "").replace("）", "").replace(",", "").replace("(", "").replace(")", "").replace(":", "")
title_list = mecab.parse(title).split()
titleEnglish_list = mecab.parse(titleEnglish).split()
result = title_list + titleEnglish_list
print(result)
```

4. 結果
```
[
  {
    "title": "（季節調整値）国内総生産（支出側）（名目）2015年基準, 単位: 10億円",
    "titleEnglish": "(Seasonally adjusted value) Gross domestic product (expenditure side) (nominal) 2015 base, unit: billion yen",
    "tags": ['季節', '調整', '値', '国内', '総', '生産', '支出', '側', '名目', '2015', '年', '基準', '単位', '10', '億', '円', 'Seasonally', 'adjusted', 'value', 'Gross', 'domestic', 'product', 'expenditure', 'side', 'nominal', '2015', 'base', 'unit', 'billion', 'yen']
  },
	...
]
```
### 3. tagsあり と tagsなし で検索性能を比較

**結論: tagsをつけると過剰にヒットする**

- 「賃金」「国内」「調整」「賃ぎん」「担ぽ」「内総」「無担」

日本語の検索結果について, 上記の7つを検索したところ違いは見られませんでした.

- 「nominal」

  nominal を検索すると, 単語上にnominal が出現していないデータもヒットしてしまいました. tagsなし検索で5件（うち1件のみnominalが出現）, tagsあり検索で7件（うち1件のみnominalが出現）.

  そこで, tagsのみを使用しての検索を試みました. すると, ヒットした結果は 7件でした. tags を導入することで逆に fuse.js のあいまい検索が余計に仕事をしているものと思われます. このような過剰にヒットするという現象は日本語では表れませんでした. 

### 4. 検索時の過剰なヒットを避ける方法について

fuse.jsをそのまま使用し続ける方法とfuse.jsを使用せずに工夫する方法の二つを提案します.

1. fuse.js の検索オプションを調整
    1. `minMatchCharLength` を 2に設定
    2. `thoreshold` を 0.6 から下げる
2. tagsのみに対して単純な完全一致検索

まず，前回の打ち合わせで教えていただいた，mecabの辞書を新しくする方法を試しました．

### 5. Neologd辞書を使用

辞書の種類がいくつかあると知ったので，どれが新しくて単語を適切に分割できるか調べました（[1](https://qiita.com/hi-asano/items/aaf406db875f1c81530e)）

**NEologd** について次のような説明があったため，仕様を決めました．

> Web上のあらゆる新語が追加された巨大な辞書です。今もなお頻繁に更新されています。Twitterデータなどを解析するときの助けになります。

使い方は，[こちら](https://zenn.dev/robes/articles/e17e298d0b0b9a)の記事を参考にしました．
[Googleコラボ](https://colab.research.google.com/drive/1MU4jH1jmMj6w003-ZwTQ4WhI_RtMUD76?usp=sharing)のリンクです．

結果は次のように “国内総生産”や “季節調整値” のように以前なら分割されていた単語が一つにまとまりました．次項では，このタグデータを使用して，パラメータの調整を行なっていきます．

```
[
  {
    "title": "（季節調整値）国内総生産（支出側）（名目）2015年基準, 単位: 10億円",
    "titleEnglish": "(Seasonally adjusted value) Gross domestic product (expenditure side) (nominal) 2015 base, unit: billion yen",
    "tags": [
      "季節調整値",
      "国内総生産",
      "支出",
      "側",
      "名目",
      "2015年",
      "基準",
      "単位",
      "10億円",
      "Seasonally",
      "adjusted",
      "value",
      "Gross",
      "domestic",
      "product",
      "expenditure",
      "side",
      "nominal",
      "2015",
      "base",
      "billion",
      "yen"
    ]
 },
```

### 6. fuse.js のパラメータ調整

次の単語について検索精度を調べることにします．

- 日本語
    - 国内総生産
    - 現金給与総額
    - 完全失業率
    - 総人口
    - 研究費
    - 科学技術研究費
    - コールレート
    - 鉱業生産指数
    - 日経平均株価
    - 食料自給率
- 英語
    - seasonally adjusted
    - gross domestic product
    - population
    - unemployed
    - call rate
    - rate
    - Nikkei
- tagsに存在しない語や誤字を含む日本語
    - 国内総支出
    - 現金給与合計
    - 日経平均の株価
    - 科学 技術 研究費
    - 食料自足
- tags に存在しない語や誤字を含む英語
    - GDP
    - salaly
    - unemproyd
    - mean stock

検証した結果は[スプレッドシート](https://docs.google.com/spreadsheets/d/1Bcafl-iCsFW9hDp1X4r4UfJdVflCeRbePHASToL9O6k/edit?usp=sharing)にまとめました．

## 参考記事

- https://www.yoheim.net/blog.php?q=20191105
