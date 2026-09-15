import { createComponent, createIntegration } from '@gitbook/runtime';

import {
    rateEngineJavaScript,
    rateWebframeHtml,
    scheduleEngineJavaScript,
    scheduleWebframeHtml,
} from './generated-assets';

const scheduleGenerator = createComponent({
    componentId: 'schedule-generator',
    async render(element, { environment }) {
        if (element.context.type !== 'document') {
            throw new Error('The schedule generator can only render in a document.');
        }

        const source = new URL(environment.integration.urls.publicContentEndpoint);
        source.searchParams.set('v', String(environment.integration.version));

        return (
            <block>
                <webframe
                    source={{ url: source.toString() }}
                    aspectRatio={3 / 4}
                    data={{}}
                />
            </block>
        );
    },
});

const reimbursementRateFinder = createComponent({
    componentId: 'reimbursement-rate-finder',
    async render(element, { environment }) {
        if (element.context.type !== 'document') {
            throw new Error('The reimbursement rate finder can only render in a document.');
        }

        const source = new URL(environment.integration.urls.publicContentEndpoint);
        source.searchParams.set('tool', 'rate');
        source.searchParams.set('v', String(environment.integration.version));

        return (
            <block>
                <webframe
                    source={{ url: source.toString() }}
                    aspectRatio={16 / 9}
                    data={{}}
                />
            </block>
        );
    },
});

const hacktoberfestReimbursementRateFinder = createComponent({
    componentId: 'hacktoberfest-reimbursement-rate-finder',
    async render(element, { environment }) {
        if (element.context.type !== 'document') {
            throw new Error('The reimbursement rate finder can only render in a document.');
        }

        const source = new URL(environment.integration.urls.publicContentEndpoint);
        source.searchParams.set('tool', 'rate');
        source.searchParams.set('theme', 'hacktoberfest');
        source.searchParams.set('v', String(environment.integration.version));

        return (
            <block>
                <webframe
                    source={{ url: source.toString() }}
                    aspectRatio={16 / 9}
                    data={{}}
                />
            </block>
        );
    },
});

export default createIntegration({
    fetch: async (request) => {
        const url = new URL(request.url);

        if (url.searchParams.get('asset') === 'schedule-engine') {
            return new Response(scheduleEngineJavaScript, {
                headers: {
                    'Content-Type': 'text/javascript; charset=utf-8',
                    'Cache-Control': 'public, max-age=300',
                },
            });
        }

        if (url.searchParams.get('asset') === 'rate-engine') {
            return new Response(rateEngineJavaScript, {
                headers: {
                    'Content-Type': 'text/javascript; charset=utf-8',
                    'Cache-Control': 'public, max-age=300',
                },
            });
        }

        if (url.searchParams.get('tool') === 'rate') {
            const rateTheme = url.searchParams.get('theme');
            const themedRateWebframeHtml = rateTheme === 'hacktoberfest'
                ? rateWebframeHtml.replace(
                    '<html lang="en">',
                    '<html lang="en" data-theme="hacktoberfest">',
                )
                : rateWebframeHtml;

            return new Response(themedRateWebframeHtml, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=300',
                },
            });
        }

        return new Response(scheduleWebframeHtml, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=300',
            },
        });
    },
    components: [
        scheduleGenerator,
        reimbursementRateFinder,
        hacktoberfestReimbursementRateFinder,
    ],
});
