# 参考资产账本合同

`.movie-create/reference-assets.json` 是可选的内部资产账本，不是第五个用户交付块。它只记录真实资产的可追溯状态；`ref_anchors` 仍然只是语义 ID。

```json
{
  "schema_version": 1,
  "assets": [{
    "semantic_id": "角色名",
    "kind": "character_identity|scene_reference|storyboard_frame|prop_reference|action_reference|audio_reference",
    "source_prompt": "生成该资产的提示词或来源说明",
    "file": "相对项目根目录的文件路径或 null",
    "platform_asset_id": "平台资产 ID 或 null",
    "availability_status": "prompt_only|generated|verified|missing|ambiguous",
    "uses": ["identity"],
    "shot_ids": ["S01-01"]
  }]
}
```

只有 `availability_status=verified` 且实际文件或平台 ID 存在的资产，才可能在一次视频请求中绑定为图片。不得把 Markdown、ASCII 蓝图或提示词当作图片。非空 `platform_asset_id` 只表示已有平台注册回执的声明；离线 validator 不能证明平台资产仍存活，运行/平台侧仍需再次确认。

`verified.file` 必须是项目根相对路径，且扩展名属于媒体白名单：`.png`、`.jpg`、`.jpeg`、`.webp`、`.gif`、`.bmp`、`.tif`、`.tiff`、`.mp4`、`.mov`、`.webm`、`.mkv`、`.avi`、`.mp3`、`.wav`、`.m4a`、`.aac`、`.flac` 或 `.ogg`，文件必须真实存在；也可以使用非空 `platform_asset_id` 表示外部注册资产。
