/**
 * This macro clears all scenes from navigation except any named "Test"
 *
 * Usage:
 * - Run macro
 */
game.scenes.updateAll({navigation: false});
game.scenes.getName("Test").update({navigation: true});
