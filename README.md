# IL-13 / レブリキズマブ 教育用 WebAR

学会・医療教育講演で使う、インストール不要のマーカー型 WebAR です。スマートフォンのブラウザでページを開き、カメラをトリガー画像に向けると、IL-13 シグナルとレブリキズマブの作用機序を three.js の模式的 3D アニメーションで表示します。

## 構成

```text
.
├── index.html
├── src/
│   ├── main.js
│   ├── scene.js
│   ├── states.js
│   ├── styles.css
│   └── ui.js
└── assets/
    ├── slide-marker-sample.png
    └── targets.mind
```

`assets/targets.mind` と `assets/slide-marker-sample.png` には、ローカル参照や印刷確認にも使えるよう MindAR 公式 card 例のコピーを同梱しています。既定のアプリ起動は仕様どおり CDN 上の公式 target を参照します。

`index.html` の importmap は指定バージョンに固定しています。

```html
{
  "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
  "mindar-image-three": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
}
```

## ローカル確認

静的ファイルのみなので、任意の HTTP サーバで配信できます。

```bash
python3 -m http.server 4173
```

その後、`http://localhost:4173/` を開きます。スマートフォン実機では HTTPS が必要です。localhost 以外の HTTP ではカメラが起動しません。

## デプロイ

Netlify Drop、GitHub Pages、Vercel などの静的ホスティングに、このディレクトリの中身をそのまま配置してください。バックエンド、DB、ログイン、Cookie、localStorage は使っていません。

## 既定のトリガー画像

初回から動作確認できるように、`src/main.js` の `DEFAULT_IMAGE_TARGET` は MindAR 公式 card 例を参照しています。

- target: `https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind`
- image: `https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png`

同じ card 画像を別画面や紙に表示し、スマートフォンのカメラを向けてください。

## 自前スライド画像への差し替え

1. トリガーにするスライド内画像を PNG または JPG で用意します。
2. MindAR 画像コンパイラを開きます: `https://hiukim.github.io/mind-ar-js-doc/tools/compile`
3. 画像をアップロードして `targets.mind` を生成します。
4. 生成したファイルを `assets/targets.mind` として置きます。
5. `src/main.js` の `DEFAULT_IMAGE_TARGET` を `./assets/targets.mind` に変更します。

一時的な確認だけなら、URL パラメータでも指定できます。

```text
https://example.com/?target=./assets/targets.mind
```

## トリガー画像の運用注意

投影スクリーン上の画像を客席から狙うと、距離、角度、明るさ、モアレの影響で不安定になることがあります。特徴量が多く、高コントラストで、反復パターンが少ない画像を使ってください。講演では、スライド内だけでなく QR カードや配布資料側にも同じトリガー図を置くと安定します。

## 生物学的表現

- IL-13 は IL-13Rα1 に結合します。
- IL-4Rα がリクルートされ、II 型受容体のヘテロ二量体が形成されると、JAK / STAT6 経路が活性化し、核内転写として炎症・かゆみ・皮膚バリア障害を表示します。
- IL-13Rα2 はデコイ受容体として常時表示し、シグナルを出さない経路として表現しています。
- レブリキズマブ状態では、抗体が IL-13 に結合します。IL-13Rα1 への結合は保たれますが、IL-4Rα のリクルートを阻止するため STAT6 は不活性化されます。
- IL-13Rα2 デコイへの結合は阻害状態でも温存して表示しています。

分子構造の精密再現ではなく、講演中に読み取れる教育用模式図として設計しています。

## 色凡例

- IL-13: マゼンタ
- IL-13Rα1: ティール
- IL-4Rα: アンバー
- レブリキズマブ: ブルー
- STAT6 シグナル: グリーン
- IL-13Rα2 デコイ: グレー

## 将来の Blender / GLB 差し替え

`src/scene.js` は `createEducationScene()` がルート `THREE.Group` と `setState()` / `update()` を返す構造です。Blender で作成した `.glb` に差し替える場合は、プリミティブ生成関数を `GLTFLoader` のロード結果に置き換え、同じパーツ名または参照を `applyState()` に渡すと最小改修で移行できます。

## フォールバック

以下の場合は日本語メッセージを表示します。

- HTTPS ではない公開 URL
- `navigator.mediaDevices.getUserMedia` 非対応
- カメラ権限拒否
- MindAR 初期化失敗

## 出典メモ

作用機序の文言は、IL-13 が IL-13Rα1 に結合した後 IL-4Rα をリクルートして STAT6 経路を活性化すること、IL-13Rα2 がデコイ受容体として働くこと、レブリキズマブが IL-13 に結合し IL-4Rα リクルートを阻止しつつ IL-13Rα2 結合を温存すること、という仕様に沿って作成しました。講演スライドでは、使用する製品情報・総説・査読済み文献の表記に合わせて監修してください。

## 合理的な仮定

- 手元のプロトタイプ `il13-lebrikizumab-webar.html` は指定パスに見つからなかったため、この README と実装は提示仕様を機能的ベースラインとして作成しました。
- `assets/targets.mind` は公式 card 例のコピーを同梱しています。自前スライド画像コンパイル後はこのファイルを差し替える運用を想定しています。既定動作は公式 CDN の card target を使います。
- 本コンテンツは医療教育用であり、診断、推論、患者画像の保存や送信は行いません。
- 追補改修では、3D内ラベルを最大6個に絞るため、炎症・かゆみ・バリア障害の語は主にキャプションで説明し、3D内ではSTAT6粒子流と核発光で表現しています。
- 発光は MindAR の透明キャンバス合成を保つため、postprocessing を使わず、加算ブレンドのスプライトハローで表現しています。
