const { withSettingsGradle } = require('@expo/config-plugins');

/**
 * expo prebuild ставит rootProject.name = expo.name («Ростикс Менеджер» —
 * кириллица с пробелом). Плагин com.facebook.react.rootproject на Windows
 * шеллит команды с этим именем без экранирования и падает с
 * "Синтаксическая ошибка в имени файла..." (мусорные символы — это она же,
 * просто в другой кодировке). Название приложения на экране это не меняет
 * (оно берётся из strings.xml/app.json отдельно) — только внутренний
 * идентификатор Gradle-проекта.
 */
module.exports = function withAsciiRootProjectName(config) {
  return withSettingsGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /rootProject\.name\s?=\s?(["']).*?\1/,
      "rootProject.name = 'rostics-manager'"
    );
    return config;
  });
};
