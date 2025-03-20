class AttachmentFormatter {
    static stories(data, storyID) {
        return {
            bucketID: data?.bucket?.id.toString(),
            message: '',
            queryStorieID: storyID ? storyID : null,
            attachments: data?.bucket?.unified_stories?.edges.map( item => ({
                
                id: item?.node?.id,
                type: item?.node?.attachments?.[0]?.media?.__typename,
                url: item?.node?.attachments?.[0]?.media?.__typename === 'Photo' ? item?.node?.attachments?.[0]?.media?.image?.uri :
                    {
                        sd: item?.node?.attachments?.[0]?.media?.browser_native_sd_url,
                        hd: item?.node?.attachments?.[0]?.media?.browser_native_hd_url,
                    }
            
            }))
        }
    };

    static previewMedia(data) {
        return {
            id: data?.link_preview.story_attachment?.style_infos?.[0]?.fb_shorts_story?.post_id,
            message: (data?.link_preview.story_attachment?.title || '') + '',
            attachments: [{
                id: data?.link_preview.story_attachment?.style_infos?.[0]?.fb_shorts_story?.short_form_video_context?.video?.id.toString(),
                type: 'Video',
                url: {
                    sd: data?.link_preview.story_attachment?.style_infos?.[0]?.fb_shorts_story?.short_form_video_context?.video?.original_download_url_sd,
                    hd: data?.link_preview.story_attachment?.style_infos?.[0]?.fb_shorts_story?.short_form_video_context?.video?.original_download_url_hd,
                }
            }]
        }
    };

    static mobileMedia(data) {
        return {
            id: data?.reduced_node?.post_id.toString(),
            message: (data?.reduced_node?.message?.text || '') + '',
            attachments: data?.mediaset?.media?.edges.map(item => ({
                id: item.node?.id.toString(),
                type: item.node?.__typename,
                url: item.node?.__typename == 'Photo' ? item?.node?.image?.uri :
                    {
                        sd: item?.node?.playable_url,
                        hd: item?.node?.hd_playable_url,
                    },
            }))
        };
    };

    static webMedia(data) {
        const type = data?.attachments[0]?.styles?.attachment ||
            data.attached_story?.attachments[0]?.styles?.attachment ||
            data?.content?.story?.attached_story?.attachments[0]?.styles?.attachment ||
            data?.content?.story?.comet_sections ||
            data?.comet_sections?.attached_story?.story?.attached_story?.comet_sections?.attached_story_layout?.story?.attachments?.[0]?.styles?.attachment;

        if (type?.subattachments) {
            return {
                message: (data?.message?.text || '') + '',
                attachments: (data?.attachments[0]?.styles?.attachment?.subattachments || data?.comet_sections?.attached_story?.story?.attached_story?.comet_sections?.attached_story_layout?.story?.attachments?.[0]?.styles?.attachment?.subattachments).filter(item => item?.multi_share_media_card_renderer?.attachment?.media?.__typename !== 'GenericAttachmentMedia').map( item => ({
                    id: item?.multi_share_media_card_renderer?.attachment?.media?.id?.toString(),
                    type: item?.multi_share_media_card_renderer?.attachment?.media?.__typename,
                    url: item?.multi_share_media_card_renderer?.attachment?.media?.__typename === 'Photo' ? item?.multi_share_media_card_renderer?.attachment?.media?.image?.uri :
                        {
                            sd: item?.multi_share_media_card_renderer?.attachment?.media?.browser_native_sd_url,
                            hd: item?.multi_share_media_card_renderer?.attachment?.media?.browser_native_hd_url,
                        },

                }))
            };
        }
        else if (type?.media) {
            const mediaData = data?.attachments[0]?.styles?.attachment || data.attached_story?.attachments[0]?.styles?.attachment;
            return {
                message: (data?.message?.text || '') + '',
                attachments: [{
                    id: mediaData?.media?.id?.toString(),
                    type: mediaData?.media?.__typename,
                    url: mediaData?.media?.__typename == 'Photo' ? mediaData?.media?.photo_image?.uri || mediaData?.media?.image?.uri :
                        {
                            sd: mediaData?.media.browser_native_sd_url,
                            hd: mediaData?.media.browser_native_he_url,
                        }
                }]
            };
        }
        else if (type?.style_infos) {
            return {
                message: (data?.message?.text || (data?.attachments[0]?.styles?.attachment?.style_infos[0]?.fb_shorts_story?.message?.text || '')) + '',
                attachments: [{
                    id: data?.attachments[0]?.styles?.attachment?.style_infos?.[0]?.fb_shorts_story?.short_form_video_context?.playback_video?.id?.toString(),
                    type: 'Video',
                    url: {
                        sd: data?.attachments[0].styles.attachment.style_infos[0].fb_shorts_story.short_form_video_context.playback_video.browser_native_sd_url,
                        hd: data?.attachments[0].styles.attachment.style_infos[0].fb_shorts_story.short_form_video_context.playback_video.browser_native_hd_url,
                    }
                }]
            };
        }
        else return { error: 'Cannot fetch stories & media info.', at: 'FetchStoriesAndMedia', detail: 'Facebook did not respond with correct data.' };
    }
}

module.exports.AttachmentFormatter = AttachmentFormatter;
