# 视频配置与本次绑定合同

`.movie-create/video-config.json` 是内部状态文件，不是用户交付物。它记录本次视频编译的模型选择和请求级资产绑定。

```json
{
  "schema_version": 1,
  "target_model": "seedance|h3|null",
  "selection_source": "user_explicit|user_explicit_default|null",
  "output_variant": "single|dual",
  "state": "locked|needs_confirmation",
  "bindings": [{
    "semantic_id": "角色名",
    "shot_id": null,
    "use": "identity",
    "source": "relative/path.png 或平台资产来源",
    "platform_tag": "按模型编译时填写或 null",
    "upload_order": 1,
    "status": "bound|missing|ambiguous"
  }]
}
```

“继续”不等于模型授权。`target_model=null` 或任一必需绑定未解决时必须保持 `needs_confirmation`，不生成 04。明确说“默认即可”才可使用 `user_explicit_default` 锁定 Seedance。生成 04 前必须将本文件作为第一参数、`reference-assets.json` 作为第二参数执行联合校验。

`locked` 必须有目标模型、选择来源，且不得含 `missing`/`ambiguous`。每个 `bound` 必须有 source、非空模型标签、唯一正整数 `upload_order`；Seedance 只能使用与序号一致的 `<图片N>`，H3 只能使用 `<Picture N>`，禁止混用。`needs_confirmation` 可以已经选定模型，但仍有未解决绑定。

每个 `bound` 必须在账本中找到同 `semantic_id` 的 `verified` 资产，`source` 必须精确匹配其 `file` 或 `platform_asset_id`，`use` 必须包含于账本 `uses`。`storyboard_frame` 必须提供非空 `shot_id` 且该镜头在账本 `shot_ids` 中；其他资产的 `shot_id` 可为 null。
