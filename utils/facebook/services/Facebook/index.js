const { Utils } = require('./utils');
const { AttachmentFormatter } = require('./attachment');

class Facebook {
    #urlRegex = /\b(?:https?:\/\/(?:www\.)?(?:facebook\.com|mbasic\.facebook\.com|m\.facebook\.com|mobile\.facebook\.com|fb\.watch|web\.facebook)[^\s]*)\b/g;
    #IGUrlRegex = /(https:\/\/www\.instagram\.com\/(stories|p|reel|tv)\/[a-zA-Z0-9_\-\/?=\.]+)(?=\s|\/|$)/g
    #onlyVideoRegex = /^https:\/\/(?:www|m|mbasic|mobile|web)\.facebook\.com\/(?:watch\?v=\d+|reel\/|videos\/[^\/?#]+\/?\??[^\/?#]*)$/;
    #profileRegex = /^https:\/\/(?:(www|m|mbasic|mobile|web)\.)?facebook\.com\/(?!(?:watch|photo|groups|share|stories|reel|videos|pages|story.php|permalink.php|video.php))(?:(?!profile\.php\?id=\d+\?)[^\/?]+|profile\.php\?id=\d+\?(?!id=).*|\profile\.php\?id=\d+$)\/?\??[^\/?]*$/;
    #storiesRegex = /\/stories\/(\d+)(?:\/([^\/?]+))?/;


    async #StoriesBucketQuery(bucketID, storyID) {
        const resData = await Utils.postWithToken(
            'https://graph.facebook.com/graphql',
            {
                fb_api_caller_class: 'RelayModern',
                fb_api_req_friendly_name: 'StoriesSuspenseContentPaneRootWithEntryPointQuery',
                doc_id: '7114359461936746',
                variables: JSON.stringify({ bucketID: bucketID, blur: 10, cursor: null, scale: 1 })
            },
        ).then(data => Utils.parseFromBody(data)).catch(error => error?.response?.body || error.message);
        return AttachmentFormatter.stories((resData?.data || resData?.[0].data), storyID);
    };

    async FetchStoriesAndMedia(url) {
        try {
            if (this.#storiesRegex.test(url))
                return this.#StoriesBucketQuery(this.#storiesRegex.exec(url)[1], this.#storiesRegex.exec(url)[2]);

            if (!this.#urlRegex.test(url))
                return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'The URL you entered is not valid.' };
                
            if (this.#profileRegex.test(url))
                return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'The URL you entered is not valid.' };

            let resData = await Utils.postWithToken(
                'https://graph.facebook.com/graphql',
                {
                    fb_api_req_friendly_name: 'ComposerLinkPreviewQuery',
                    client_doc_id: '89598650511870084207501691272',
                    variables: JSON.stringify({
                        params: {
                            url: url
                        }
                    })
                },
            ).then(data => Utils.parseFromBody(data)).catch(error => error?.response?.body || error.message);
            if (!resData || resData.error || resData.errors) return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'Facebook did not respond with correct data.' };

            if (this.#onlyVideoRegex.test(url) || this.#onlyVideoRegex.test(decodeURIComponent(resData?.data?.link_preview?.story_attachment?.style_infos?.[0]?.fb_shorts_story?.storyUrl)) || this.#IGUrlRegex.test(decodeURIComponent(resData?.data?.link_preview?.story_attachment?.style_infos?.[0]?.fb_shorts_story?.storyUrl)))
                return AttachmentFormatter.previewMedia(resData.data);

            const share_params = Utils.parseFromJSONB(resData?.data?.link_preview?.share_scrape_data).share_params;

            if (share_params && this.#storiesRegex.test(share_params?.urlInfo?.canonical))
                return this.#StoriesBucketQuery(this.#storiesRegex.exec(share_params?.urlInfo?.canonical)[1], this.#storiesRegex.exec(share_params?.urlInfo?.canonical)[2]);

            if (!resData?.data?.link_preview?.story?.id) return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'Facebook did not respond with correct data.' };

            const post_id = share_params[0]?.toString();
            const node_id = resData?.data?.link_preview?.story?.id;

            resData = await Utils.postWithToken(
                'https://graph.facebook.com/graphql',
                {
                    fb_api_req_friendly_name: 'FetchGraphQLStoryAndMediaFromTokenQuery',
                    client_doc_id: '14968485422525517963281561600',
                    variables: JSON.stringify({ action_location: "feed", include_image_ranges: true, image_medium_height: 2048, query_media_type: "ALL", automatic_photo_captioning_enabled: false, image_large_aspect_height: 565, angora_attachment_profile_image_size: 110, profile_pic_media_type: "image/x-auto", poll_facepile_size: 110, scale: 3, enable_cix_screen_rollout: true, default_image_scale: 3, angora_attachment_cover_image_size: 1320, poll_voters_count: 5, image_low_height: 2048, image_large_aspect_width: 1080, image_low_width: 360, image_high_height: 2048, question_poll_count: 100, node_id: node_id, icon_scale: 3, nt_context: { styles_id: "e6c6f61b7a86cdf3fa2eaaffa982fbd1", using_white_navbar: true, pixel_ratio: 3, is_push_on: true, bloks_version: "c3cc18230235472b54176a5922f9b91d291342c3a276e2644dbdb9760b96deec" }, can_fetch_suggestion: false, profile_image_size: 110, reading_attachment_profile_image_height: 371, reading_attachment_profile_image_width: 248, fetch_fbc_header: true, size_style: "contain-fit", photos_feed_reduced_data_fetch: true, media_paginated_object_first: 200, in_channel_eligibility_experiment: false, fetch_cix_screen_nt_payload: true, media_token: `pcb.${post_id}`, fetch_heisman_cta: true, fix_mediaset_cache_id: true, location_suggestion_profile_image_size: 110, image_high_width: 1080, media_type: "image/jpeg", image_medium_width: 540 }),
                    fb_api_caller_class: 'graphservice',
                    fb_api_analytics_tags: JSON.stringify(["At_Connection", "GraphServices"])
                },
            ).then(data => Utils.parseFromBody(data)).catch(error => error?.response?.body || error.message);

            if (!resData || resData.error || resData.errors) return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'Facebook did not respond with correct data.' };
            
            if (!resData?.data?.mediaset?.media?.edges || resData?.data?.mediaset?.media?.edges.length == 0) {
                resData = await Utils.postWithToken(
                    'https://graph.facebook.com/graphql',
                    {
                        fb_api_req_friendly_name: 'CometSinglePostContentQuery',
                        doc_id: 8362454010438212,
                        variables: JSON.stringify({ feedbackSource: 2, feedLocation: "PERMALINK", privacySelectorRenderLocation: "COMET_STREAM", renderLocation: "permalink", scale: 1.5, storyID: node_id, useDefaultActor: false, })
                    },
                ).then(data => Utils.parseFromBody(data)).catch(error => error?.response?.body || error.message);

                if (!resData || resData.error || resData.errors) return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'Facebook did not respond with correct data.' };

                const { content } = resData?.data?.node?.comet_sections || resData[0]?.data?.node?.comet_sections;
                return { id: post_id, ...AttachmentFormatter.webMedia(content.story) };
            }
            return AttachmentFormatter.mobileMedia(resData?.data);
        }
        catch (error) {
            console.error(error);
            return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: error?.response || error.message }
        }
    };
};

module.exports.Facebook = Facebook;
