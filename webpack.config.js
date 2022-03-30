'use strict';

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');
const path = require('path');
const fs = require('fs');

const sourceFolders = [
    path.join(__dirname, 'tasks'),
    path.join(__dirname, 'node_modules')
];

module.exports = function (env) {
    let production = env && env.mode === 'production';

    let dist_folder = production ? 'dist-prod' : 'dist';

    let config = {
        entry: {
            //added for all tasks in tasks folder
            //'taskname': 'taskname/taskname.js',
        },
        output: {
            path: path.join(__dirname, dist_folder),
            filename: '[name].js',
            library: '[name]',
            // https://github.com/webpack/webpack/issues/1194#issuecomment-565960948
            devtoolNamespace: 'devtool_namespace'
        },
        resolve: {
            modules: sourceFolders,
            extensions: ['.js', '.ts']
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    include: sourceFolders,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            "presets": [
                                ["@babel/preset-env", {
                                    "useBuiltIns": "usage",
                                    "targets": {
                                        "ie": "11"
                                    },
                                    "corejs": 3
                                }]
                            ],
                            "plugins": [
                                "@babel/plugin-transform-arrow-functions",
                                "@babel/plugin-syntax-dynamic-import",
                                "@babel/plugin-proposal-class-properties",
                                "@babel/plugin-proposal-export-namespace-from",
                                "@babel/plugin-proposal-throw-expressions"
                            ]
                        }
                    }
                },
                {
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader, //TODO remove empty main (with javascript)
                        {
                            loader: 'css-loader',
                            options: {
                                "url": false
                            }
                        },
                        'sass-loader'
                    ],
                },
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
            ]
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: "[name].css",
            })
        ]
    };

    let debugConfig = {
        mode: 'development',
        devtool: 'source-map',
        output: {
            pathinfo: true
        }
    };

    let productionConfig = {
        mode: "production",
        optimization: {
            minimize: true,
            minimizer: [
                `...`,
                new CssMinimizerPlugin()
            ],
        }
    };

    find_all_tasks_and_add_to_config(config, dist_folder);

    if (production)
        config = merge(config, productionConfig);
    else
        config = merge(config, debugConfig);

    console.log("config is: ", config);
    return config;
};

function find_all_tasks_and_add_to_config(config, dist_folder) {
    config.entry = {};

    let task_html_template = fs.readFileSync('./tasks/task.html', {encoding: "utf8"});

    if (!fs.existsSync(dist_folder))
        fs.mkdirSync(dist_folder);

    fs.readdirSync('./tasks').forEach(file => {
        add_task_to_config(file, config, task_html_template, dist_folder);
    });
}

function process_html_template(task_html_template, task_name) {
    let capitalized_task_name = task_name.charAt(0).toUpperCase() + task_name.slice(1);

    function replace_all(where, what, to) {
        let replacement = new RegExp('\\[' + what + '\\]', 'g');
        return where.replace(replacement, to);
    }

    task_html_template = replace_all(task_html_template, 'TASKNAME', task_name);
    task_html_template = replace_all(task_html_template, 'TASKNAME\\|CAPITALIZE', capitalized_task_name);

    task_html_template = replace_all(task_html_template, 'XXX', (new Date()).getTime()); //-- peter

    return task_html_template;
}

//TODO use copy plugin with transformer parameter
function add_task_to_config(task_name, config, task_html_template, dist_folder) {
    if (task_name.indexOf('.') >= 0) // skip non directories
        return;

    //add entries
    let task_file_js = path.join(task_name, task_name + '.js');
    let task_file_ts = path.join(task_name, task_name + '.ts');
    config.entry[task_name] = fs.existsSync('tasks/' + task_file_ts) ? task_file_ts : task_file_js;

    //copy html
    let output_html = process_html_template(task_html_template, task_name);
    fs.writeFileSync(path.join(dist_folder, task_name + '.html'), output_html, {encoding: "utf8"});

    //copy assets
    let resources_folder_name = task_name + '-resources';
    config.plugins.push(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, './node_modules/blockly/media'),
                    to: path.resolve(__dirname, 'tasks', task_name, resources_folder_name)
                },
                {
                    from: '*',
                    to: './' + resources_folder_name,
                    context: path.resolve(__dirname, 'tasks', task_name, resources_folder_name),
                    noErrorOnMissing: true
                }
            ]
        })
    );
}
