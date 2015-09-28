/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../_references.ts"/>

module powerbi.visuals {
    import SelectionManager = utility.SelectionManager;
    export interface VinnyViewModel {
        text: string;
        color: string;
        size: number;
        selector: SelectionId;
    }

    export class VinnyVisual implements IVisual {
        private static DefaultText = 'Invalid dataview';
        private root: D3.Selection;
        private svgText: D3.Selection;
        private dataView: DataView;
        private selectionManager: SelectionManager;

        public static converter(dataView: DataView): VinnyViewModel {
            var viewModel: VinnyViewModel = {
                size: VinnyVisual.getSize(dataView),
                color: VinnyVisual.getFill(dataView).solid.color,
                text: VinnyVisual.DefaultText,
                selector: SelectionId.createNull()
            };

            var table = dataView.table;

            if (!table) {
                return viewModel;
            }

            viewModel.text = table.rows[0][2];

            if (dataView.categorical) {
                viewModel.selector = dataView.categorical.categories[0].identity ? SelectionId.createWithId(dataView.categorical.categories[0].identity[0]) : SelectionId.createNull();
            }

            return viewModel;
        }

        public init(options: VisualInitOptions): void {
            this.root = d3.select(options.element.get(0))
                .append('svg')
                .classed('vinny', true);

            this.svgText = this.root
                .append('text')
                .style('cursor', 'pointer')
                .style('stroke', 'green')
                .style('stroke-width', '0px')
                .attr('text-anchor', 'middle');

            this.selectionManager = new SelectionManager({ hostServices: options.host });
        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews && !options.dataViews[0]) return;
            var dataView = this.dataView = options.dataViews[0];
            var viewPort = options.viewport;
            var viewModel: VinnyViewModel = VinnyVisual.converter(dataView);

            this.root.attr({
                'height': viewPort.height,
                'width': viewPort.width
            });

            var textProperties = {
                fontFamily: 'tahoma',
                fontSize: viewModel.size + 'px',
                text: viewModel.text
            };

            var textHeight = TextMeasurementService.estimateSvgTextHeight(textProperties);

            var selectionManager = this.selectionManager;

            this.svgText.style({
                'fill': viewModel.color,
                'font-size': textProperties.fontSize,
                'font-family': textProperties.fontFamily
            }).attr({
                'y': viewPort.height / 2 + textHeight / 3 + 'px',
                'x': viewPort.width / 2
            }).text(viewModel.text).on('click', function () {
                selectionManager.select(viewModel.selector)
                    .then(ids=> d3.select(this)
                        .style('stroke-width', ids.length > 0 ? '2px' : '0px')
                    );
            }).data([viewModel]);
        }

        private static getFill(dataView: DataView): Fill {
            if (dataView) {
                var objects = dataView.metadata.objects;
                if (objects) {
                    var general = objects['general'];
                    if (general) {
                        var fill = <Fill>general['fill'];
                        if (fill)
                            return fill;
                    }
                }
            }
            return { solid: { color: 'red' } };
        }

        private static getSize(dataView: DataView): number {
            if (dataView) {
                var objects = dataView.metadata.objects;
                if (objects) {
                    var general = objects['general'];
                    if (general) {
                        var size = <number>general['size'];
                        if (size)
                            return size;
                    }
                }
            }
            return 100;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            var dataView = this.dataView;
            switch (options.objectName) {
                case 'general':
                    var general: VisualObjectInstance = {
                        objectName: 'general',
                        displayName: 'General',
                        selector: null,
                        properties: {
                            fill: VinnyVisual.getFill(dataView),
                            size: VinnyVisual.getSize(dataView)
                        }
                    };
                    instances.push(general);
                    break;
            }

            return instances;
        }

        public destroy(): void {
            this.root = null;
        }
    }
}