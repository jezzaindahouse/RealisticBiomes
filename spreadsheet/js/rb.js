if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

var element = (function(tag, parent) {
  var element = document.createElement(tag);
  if (parent) {
    parent.appendChild(element);
  }
  return element;
});
var textContent = (function(element, text) {
  if (text) {
    element.appendChild(document.createTextNode(text));
  }
  return element;
});
var row = (function(table, columns) {
  var tr = element('tr', table);
  columns.forEach((function(cell) {
    if (typeof cell === 'string') {
      textContent(element('td', tr), cell);
    } else if (cell === null) {
      element('td', tr);
    } else if (cell instanceof Array) {
      var td = element('td', tr);
      textContent(td, cell[0]);
      cell.slice(1).forEach(Function.prototype.apply.bind(td.setAttribute, td));
    } else {
      element('td', tr).appendChild(cell);
    }
  }));
});
var span = (function(text, title, classAttr) {
  var span = element('span');
  textContent(span, text);
  span.setAttribute('class', classAttr);
  span.setAttribute('title', title);
  span.setAttribute('style', 'cursor:help');
  return span;
});
var getSoilBonus = (function(soil_material, soil_max_layers, soil_layer_offset, soil_bonus_per_layer) {
  if (!soil_material || soil_max_layers == 0) return 1;
  return (soil_bonus_per_layer * soil_max_layers + 1);
});
var getSoil = (function(soil_material, soil_max_layers, soil_layer_offset, soil_bonus_per_layer) {
  if (!soil_material || soil_max_layers == 0) return null;
  return soil_material.replace('_', ' ') + ' ×' + soil_max_layers + (soil_layer_offset ? '+' + soil_layer_offset : '') + ' = ' + ((soil_bonus_per_layer * soil_max_layers + 1) * 100) + '%';
});

var hours = function(float) {
  if (float % 1 === 0) {
    return float + 'h';
  } else {
    return float.toFixed(2) + 'h';
  }
}

var displayGrowth = (function(value, persistent_growth_period) {
  return !value ? null : (persistent_growth_period ? Math.round((persistent_growth_period / value) * 100) / 100 + 'h' : value * 100 + '%');
});

var biomeCell = (function(growth, bestValue, value) {
  if (value === bestValue) {
    return [displayGrowth(value, growth.persistent_growth_period), ['class', 'success']];
  } else if (value === null) {
    return ['', ['class', 'danger']];
  } else if (value >= bestValue / 2) {
    return [displayGrowth(value, growth.persistent_growth_period), ['class', 'info']];
  } else {
    return [displayGrowth(value, growth.persistent_growth_period), ['class', 'warning']];
  }
});
var biomeGrowth = (function(growth, biomesAliasMap, biome) {
  if (typeof growth.biomes === 'undefined') {
    return null;
  }
  if (typeof growth.biomes[biome] !== 'undefined') {
    return growth.biomes[biome];
  } else {
    return growth.biomes[biomesAliasMap[biome].find((function(alias) {
      return growth.biomes[alias];
    }))] || null;
  }
});
var xhr = new XMLHttpRequest();
xhr.onload = (function(e) {
  var config = jsyaml.safeLoad(xhr.responseText, {schema: jsyaml.JSON_SCHEMA}).realistic_biomes;
  var biomes = _.uniq(Object.keys(config.biome_aliases).concat(_.flatten(_.values(config.growth).map((function(growth) {
    return _.keys(growth.biomes);
  })))));
  var biomes = _.uniq(_.flatten(_.values(config.biome_aliases))).filter((function(biome) {
    return ['ICE_MOUNTAINS', 'TAIGA_HILLS', 'FOREST_HILLS', 'SMALL_MOUNTAINS', 'DESERT_HILLS', 'JUNGLE_HILLS', 'MUSHROOM_SHORE', 'FROZEN_OCEAN', 'SKY'].indexOf(biome) === -1;
  }));
  biomes.push('SKY');
  var biomesAliasMap = _.reduce(config.biome_aliases, (function(map, biomes, alias) {
    return _.reduce(biomes, (function(map, biome) {
      if (map[biome]) {
        map[biome] = _.uniq(map[biome].concat(alias));
      } else {
        map[biome] = [alias];
      }
      return map;
    }), map);
  }), {});
  var table = document.getElementById('table');
  table.setAttribute('class', 'table table-hover table-condensed');
  var thead = element('thead', table);
  var biomeNamesMap = {
    'ICE_PLAINS': span('ICE', 'ice plains and mountains'),
    'EXTREME_HILLS': span('MOUNTAINS', 'EXTREME_HILLS and SMALL_MOUNTAINS'),
    'MUSHROOM_ISLAND': 'MUSHROOM',
    'HELL': 'NETHER',
    'SKY': 'END',
    'SWAMPLAND': 'SWAMP',
    'OCEAN': span('OCEAN', 'OCEAN and FROZEN_OCEAN')
  };
  row(thead, [
    null,
    span(null, 'When placed below the crop, blocks of this type provide a fertilizer bonus, up to the amount listed: material ×max-layers +offset-below-from-crop = growth', 'glyphicon glyphicon-tint'),
    span(null, 'Base growth or persistance: If persistence is enabled, the crop will grow to maturity regardless of whether the chunk if loaded. If not, the percentage refers roughly to vanilla growth or spawn rate.', 'glyphicon glyphicon-time'),
    span(null, 'Needs sunlight? If yes and not exposed to full sunlight, the growth is reduced exponentially the lower the light level. Additionally, the rate is further reduced according to "Low Light" modifier. Disregard if using glowstone.', 'glyphicon glyphicon-certificate'),
    span(null, 'Low Light: If a crop is exposed to anything less than full sunlight (15) this modifier is applied. Disregard if using glowstone.', 'glyphicon glyphicon-adjust'),
    span('Greenhouse', 'Greenhouse: When placed immediately adjacent to glowstone (sharing a face with the block) a crop will ignore the sunlight modifiers and use this one instead, if this rate is an improvement. The base rate and soil modifiers still apply, biome modifier applies depending on "Greenhouse ignores biome".'),
  ].concat(biomes.map((function(biome) {
    return (biomeNamesMap[biome] || biome);
  }))));

  var tbody = element('tbody', table);
  // var pre = document.createElement('pre');
  // document.body.appendChild(pre);
  // pre.innerText = JSON.stringify(config, null, '\t');
  _.each(config.growth, (function(growth, key) {
    if (key === key.toLowerCase() || key.indexOf('tree_') !== -1) {
      return ;
    }
    if (key.indexOf('mat_') !== -1) {
      key = key.substring(4);
    }
    var inherit = growth.inherit;
    while (typeof inherit !== 'undefined') {
      var growthBiomes = growth.biomes;
      growth = _.extend({}, _.cloneDeep(config.growth[inherit]), _.cloneDeep(growth));
      growth.biomes = _.extend(growthBiomes || {}, _.cloneDeep(config.growth[inherit].biomes));
      inherit = config.growth[inherit].inherit;
    }

    var soilBonus = 1 / getSoilBonus(growth.soil_material, growth.soil_max_layers, growth.soil_layer_offset, growth.soil_bonus_per_layer);

    var biomeValues = biomes.map(biomeGrowth.bind(null, growth, biomesAliasMap))
      .map(function(value) {
        if (value === null) {
          return null;
        }
        return value * (1 / soilBonus);
      });

    var bestValue = _.max([_.max(biomeValues), growth.base_rate]);
    biomeValues = biomeValues.map(biomeCell.bind(null, growth, bestValue));

    row(tbody, [
      key,
      getSoil(growth.soil_material, growth.soil_max_layers, growth.soil_layer_offset, growth.soil_bonus_per_layer),
      growth.persistent_growth_period ? hours(growth.persistent_growth_period * soilBonus) : growth.base_rate * soilBonus * 100 + '%',
      growth.needs_sunlight ? ['✓', ['class', 'warning']] : ['✗', ['class', 'info']],
      growth.not_full_sunlight_multiplier
        ? growth.not_full_sunlight_multiplier > 1
          ? ['×' + growth.not_full_sunlight_multiplier, ['class', 'success']]
          : ['÷' + (1 / growth.not_full_sunlight_multiplier), ['class', 'danger']]
        : null,
      growth.greenhouse_rate
        ? growth.persistent_growth_period
          ? [growth.persistent_growth_period * growth.greenhouse_rate + 'h', ['class', 'info']]
          : [growth.greenhouse_rate * 100 + '%', ['class', 'info']]
        : ['✗', ['class', 'danger']]
    ].concat(biomeValues));

  }));
  var biomeValues = biomes.map(biomeGrowth.bind(null, config.fish_drops.mat_RAW_FISH, biomesAliasMap));
  var bestValue = _.max([_.max(biomeValues), config.fish_drops.mat_RAW_FISH.base_rate]);
  biomeValues = biomeValues.map(biomeCell.bind(null, config.fish_drops.mat_RAW_FISH, bestValue));
  row(tbody, [
    'FISHING',
    null,
    config.fish_drops.mat_RAW_FISH.base_rate * 100 + '%',
    ['✗', ['class', 'info']],
    null,
    ['✗', ['class', 'danger']],
  ].concat(biomeValues));
});
xhr.open("GET", 'https://raw.githubusercontent.com/Civcraft/RealisticBiomes/master/config.yml', true);
xhr.send();