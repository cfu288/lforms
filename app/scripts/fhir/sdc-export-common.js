/**
 *  Defines SDC export functions that are the same across the different FHIR
 *  versions.  The function takes the SDC namespace object defined in the sdc export
 *  code, and adds additional functions to it.
 */
function addCommonSDCExportFns(ns) {
"use strict";

  var self = ns;

  /**
   * Convert LForms captured data to FHIR SDC QuestionnaireResponse
   * @param lfData a LForms form object
   * @param noExtensions a flag that a standard FHIR Questionnaire is to be created without any extensions.
   *  The default is false.
   * @param subject A local FHIR resource that is the subject of the output resource.
   *  If provided, a reference to this resource will be added to the output FHIR
   *  resource when applicable.
   * @returns {{}}
   */
  self.convertLFormsToQuestionnaireResponse = function(lfData, noExtensions, subject) {
    var target = {};
    if (lfData) {
      var source = lfData.getFormData(true,true,true,true);
      this._processRepeatingItemValues(source);
      this._setResponseFormLevelFields(target, source, noExtensions);

      if (source.items && Array.isArray(source.items)) {
        target.item = [];
        for (var i=0, iLen=source.items.length; i<iLen; i++) {
          if (!source.items[i]._repeatingItem) {
            var newItem = this._processResponseItem(source.items[i], source);
            target.item.push(newItem);
          }
        }
      }
    }
    // FHIR doesn't allow null values, strip them out.
    LForms.Util.pruneNulls(target);

    if (subject)
      target["subject"] = LForms.Util.createLocalFHIRReference(subject);

    return target;
  };


  /**
   * Convert LForms form definition to standard FHIR Questionnaire or FHIR SDC Questionnaire
   * @param lfData a LForms form object
   * @param noExtensions a flag that a standard FHIR Questionnaire is to be created without any extensions.
   *        The default is false.
   * @returns {{}}
   */
  self.convertLFormsToQuestionnaire = function(lfData, noExtensions) {
    var target = {};

    if (lfData) {
      var source = angular.copy(lfData);
      if(! (source instanceof LForms.LFormsData)) {
        source = new LForms.LFormsData(source);
      }
      this._removeRepeatingItems(source);
      this._setFormLevelFields(target, source, noExtensions);

      if (source.items && Array.isArray(source.items)) {
        target.item = [];
        for (var i=0, iLen=source.items.length; i<iLen; i++) {
          var newItem = this._processItem(source.items[i], source, noExtensions);
          target.item.push(newItem);
        }

      }
    }

    // FHIR doesn't allow null values, strip them out.
    LForms.Util.pruneNulls(target);
    return target;
  };


  /**
   * Remove repeating items in a form data object
   * @param source a LForms form data object
   * @private
   */
  self._removeRepeatingItems = function(source) {

    if (source.items && Array.isArray(source.items)) {
      for (var i= source.items.length-1; i>=0; i--) {
        // if it is a repeating item, whose _id is not 1
        if (source.items[i]._id > 1) {
          source.items.splice(i,1);
        }
        else {
          this._removeRepeatingItems(source.items[i]);
        }
      }
    }
  };


  /**
   * Set form level attributes
   * @param target a Questionnaire object
   * @param source a LForms form object
   * @param noExtensions  a flag that a standard FHIR Questionnaire is to be created without any extensions.
   *        The default is false.
   * @private
   */
  self._setFormLevelFields = function(target, source, noExtensions) {

    this.copyFields(source, target, this.formLevelFields);
    target.code = source.codeList;

    // If missing, assign title
    if(!target.title) {
      target.title = target.name;
    }

    // resourceType
    target.resourceType = "Questionnaire";
    target.status = target.status ? target.status : "draft";

    // meta
    var profile = noExtensions ? this.stdQProfile : this.QProfile;

    target.meta = target.meta ? target.meta : {};
    target.meta.profile = target.meta.profile ? target.meta.profile : [profile];
  };


  /**
   * Process itemControl based on LForms item's answerLayout and questionLayout
   * @param targetItem an item in FHIR SDC Questionnaire object
   * @param item an item in LForms form object
   * @private
   */
  self._handleItemControl = function(targetItem, item) {
    // http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl
    var itemControlType = "";
    var itemControlDisplay;
    // Fly-over, Table, Checkbox, Combo-box, Lookup
    if (!jQuery.isEmptyObject(item.displayControl)) {
      var dataType = this._getAssumedDataTypeForExport(item);
      // for answers
      if (item.displayControl.answerLayout &&
        (dataType === "CNE" || dataType === "CWE")) {
        // search field
        if (item.externallyDefined) {
          itemControlType = "autocomplete";
          itemControlDisplay = "Auto-complete";
        }
        // prefetch list
        // combo-box
        else if (item.displayControl.answerLayout.type === "COMBO_BOX") {
          itemControlType = "drop-down";
          itemControlDisplay = "Drop down";
        }
        // radio or checkbox
        else if (item.displayControl.answerLayout.type === "RADIO_CHECKBOX") {
          if (item.answerCardinality &&
            (item.answerCardinality.max === "*" || parseInt(item.answerCardinality.max) > 1)) {
            itemControlType = "check-box";
            itemControlDisplay = "Check-box";
          }
          else {
            itemControlType = "radio-button";
            itemControlDisplay = "Radio Button";
          }
        }
      }
      // for section item
      else if (item.displayControl.questionLayout && dataType === "SECTION") {
        if (item.displayControl.questionLayout === "horizontal") {
          itemControlType = "gtable"; // Not in STU3, but the binding is extensible, so we can use it
          itemControlDisplay = "Group Table";
        }
        else if (item.displayControl.questionLayout === "matrix") {
          itemControlType = "table";
          itemControlDisplay = "Vertical Answer Table";
        }
        // else {
        //   itemControlType = "List";
        // }
      }

      if (itemControlType) {
        targetItem.extension.push(
          {
            "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
            "valueCodeableConcept": {
              "coding": [{
                //"system" : "<uri>", // Identity of the terminology system
                //"version" : "<string>", // Version of the system - if relevant
                //"code" : "<code>", // Symbol in syntax defined by the system
                //"display" : "<string>", // Representation defined by the system
                //"userSelected" : <boolean> // If this coding was chosen directly by the user
                "system": "http://hl7.org/fhir/questionnaire-item-control",
                "code": itemControlType,
                "display": itemControlDisplay
              }],
              "text": itemControlDisplay || itemControlType
            }
          });
      }
    }
  };



  /**
   * Convert LForms data type to FHIR SDC data type
   * @param item an item in the LForms form object
   * @returns {string}
   * @private
   */
  self._getFhirDataType = function(item) {

    var dataType = this._getAssumedDataTypeForExport(item);
    var type = this._lformsTypesToFHIRTypes[dataType];
    // default is string
    if (!type) {
      type = 'string';
    }
    return type;
  };


  /**
   * Determine how an item's data type should be for export.

   If number type has multiple units, change it to quantity type. In such a case,
   multiple units are converted to quesionnaire-unitOption extension and the default unit
   would go into initial.valueQuantity.unit.
   For single unit numbers, use the same type, whose unit will be in questionnaire-unit extension.

   * @param item an item in the LForms form object
   * @returns {string} dataType - Data type in lforms
   * @private
   */
  self._getAssumedDataTypeForExport = function (item) {
    var dataType = item.dataType;
    if((item.dataType === 'REAL' || item.dataType === 'INT') && item.units && item.units.length > 1) {
      dataType = 'QTY';
    }
    return dataType;
  };


  /**
   * Make a FHIR Quantity for the given value and unit info.
   * @param value optional, must be an integer or decimal
   * @param itemUnit optional, lform data item.unit (that has a name property)
   * @param unitSystem optional, overrides any system in itemUnit.
   * @return a FHIR quantity or null IFF the given value is not a number (parseFloat() returns NaN).
   * @private
   */
  self._makeValueQuantity = function(value, itemUnit, unitSystem) {
    let fhirQuantity = {};
    let floatValue = parseFloat(value);

    if(! isNaN(floatValue)) {
      fhirQuantity.value = floatValue;
    }

    if(itemUnit) {
      self._setUnitAttributesToFhirQuantity(fhirQuantity, itemUnit);
      if(unitSystem) {
        fhirQuantity.system = unitSystem;
      }
    }

    return (Object.keys(fhirQuantity).length > 0) ? fhirQuantity : null;
  };


  /**
   * Make a FHIR Quantity for the given value and unit info.
   * @param value required, must be an integer or decimal
   * @param itemUnits optional, lform data item.units (An array of units)
   * @param unitSystem optional.
   * @return a FHIR quantity or null IFF the given value is not a number (parseFloat() returns NaN).
   * @private
   */
  self._makeQuantity = function(value, itemUnits, unitSystem) {
    var defaultUnit = this._getDefaultUnit(itemUnits);
    return this._makeValueQuantity(value, defaultUnit, unitSystem);
  };


  /**
   * Pick a default unit if found, otherwise return first one as default. Will return
   * null, if passed with empty list.
   * @param lformsUnits - Array of lforms units i.e with {name, default}
   * @returns {*} Return lforms unit if found otherwise null.
   * @private
   */
  self._getDefaultUnit = function (lformsUnits) {
    if(!lformsUnits || lformsUnits.length === 0) {
      return null;
    }

    var ret = null;
    for(var i = 0; i < lformsUnits.length; i++) {
      if (lformsUnits[i].default) {
        ret = lformsUnits[i];
        break;
      }
    }

    if(!ret) {
      ret = lformsUnits[0];
    }

    return ret;
  };


  /**
   * Create a key from data type to be used in a hash
   * @param prefix a prefix to be added to the key
   * @param item a LForms item
   * @returns {*}
   * @private
   */
  self._getValueKeyByDataType = function(prefix, item) {

    // prefix could be 'value', 'initial', 'answer'
    if (!prefix) {
      prefix = "value"
    }

    var fhirType = this._getFhirDataType(item);
    var dataType = fhirType === 'quantity' ? 'QTY' : item.dataType;
    var valueKey = this._lformsTypesToFHIRFields[dataType];

    return prefix + valueKey;
  };


  /**
   * Convert the minInclusive/minExclusive, maxInclusive/maxExclusive to FHIR. See the
   * the function _handleRestrictions() in sdc-export.js for more details on the context.
   * @param dataType Lforms data type, currently supporting DT, DTM, TM, REAL, and INT.
   * @param value the value (in the lforms system, either a number or a string).
   * @param valueKey the valueKey in FHIR minValue/maxValue extension (e.g., valueInteger)
   * @param minMaxKey must be one of minInclusive, minExclusive, maxInclusive, maxExclusive
   * @return The FHIR extension element. Specifically, undefined is returned if:
   *         - the given value is null or undefined, or
   *         - the dataType is not one of those listed above, or
   *         - the minMaxKey is not one of those listed above
   * @private
   */
  self._MIN_MAX_TYPES = ['DT', 'DTM', 'TM', 'REAL', 'INT']
    .reduce((map, t) => {map[t] = t; return map;}, {});
  self._MIN_MAX_KEYS = ['minExclusive', 'minInclusive', 'maxExclusive', 'maxInclusive']
    .reduce((map, t) => {map[t] = t; return map;}, {});

  self._exportMinMax = function(dataType, value, valueKey, minMaxKey) {
    if(value === null || value === undefined
      || ! self._MIN_MAX_TYPES[dataType] || ! self._MIN_MAX_KEYS[minMaxKey]) {
      return undefined;
    }

    var isoDateStr = (dataType === "DT" || dataType === "DTM")? new Date(value).toISOString():
      dataType == "TM"? new Date('1970-01-01T' + value + 'Z').toISOString(): null;

    var fhirValue =
      dataType === "DT"? isoDateStr.substring(0, 10):
      dataType === "DTM"? isoDateStr:
      dataType === "TM"? isoDateStr.substring(11, isoDateStr.length-1):
      dataType === "REAL"? parseFloat(value): parseInt(value);

    var fhirExtUrl = minMaxKey.indexOf('min') === 0?
      'http://hl7.org/fhir/StructureDefinition/minValue':
      'http://hl7.org/fhir/StructureDefinition/maxValue';

    return {
      url: fhirExtUrl,
      [valueKey]: fhirValue
    };
  };


  /**
   * A single condition in lforms translates to two enableWhen rules in core FHIR.
   *
   * @param answerKey - The answer[x] string
   * @param skipLogicCondition - Lforms skip logic condition object
   * @param sourceItem - Skip logic source item in lforms.
   * @returns {Array} - Array of enableWhen rules (two of them)
   * @private
   */
  self._createEnableWhenRulesForRangeAndValue = function(answerKey, skipLogicCondition, sourceItem) {
    var ret = [];
    Object.keys(skipLogicCondition.trigger).forEach(function(key) {
      var rule = {
        question: sourceItem.linkId,
        operator: self._operatorMapping[key]
      };
      var answer = null;
      if(answerKey === 'answerQuantity') {
        answer = self._makeQuantity(skipLogicCondition.trigger[key], sourceItem.units);
      }
      else {
        answer = skipLogicCondition.trigger[key];
      }
      if(answer) {
        rule[answerKey] = answer;
        ret.push(rule);
      }
    });

    return ret;
  };


  /**
   * Set form level attribute
   * @param target a QuestionnaireResponse object
   * @param noExtensions  a flag that a standard FHIR Questionnaire is to be created without any extensions.
   *        The default is false.
   * @param source a LForms form object

   * @private
   */
  self._setResponseFormLevelFields = function(target, source, noExtensions) {

    // resourceType
    target.resourceType = "QuestionnaireResponse";

    // meta
    var profile = noExtensions ? this.stdQRProfile : this.QRProfile;
    target.meta = target.meta ? target.meta : {};
    target.meta.profile = target.meta.profile ? target.meta.profile : [profile];

    // "identifier":
    target.identifier = {
      "system": LForms.Util.getCodeSystem(source.codeSystem),
      "value": source.code
    };

    // status, required
    // "in-progress", "completed", "amended"
    target.status = "completed";

    // authored, required
    target.authored = LForms.Util.dateToDTMString(new Date());

    // questionnaire , required
    // We do not have the ID at this point, so leave it unset for now.  Note
    // that the fomat has also changed from Reference to canonical in R4.
    /*
    target.questionnaire = {
      // questionnaireId should be an id of a related existing questionnaire resource stored in the server
      "reference": "Questionnaire/{{questionnaireId}}"
    };
    */
  };


  /**
   * Set unit attributes to a given FHIR quantity.
   *
   * @param fhirQuantity - FHIR Quantity object
   * @param lfUnit - Lforms unit, which includes name, code and system.
   * @private
   */
  self._setUnitAttributesToFhirQuantity = function(fhirQuantity, lfUnit) {
    if(fhirQuantity && lfUnit) {
      if(lfUnit.name) {
        fhirQuantity.unit = lfUnit.name;
      }

      if(lfUnit.code) {
        fhirQuantity.code = lfUnit.code;
      }

      // Unit system is optional. It was using a default system before,
      // Now we have an defined system field, read it from data and
      // not assume a default.
      if(lfUnit.system) {
        fhirQuantity.system = lfUnit.system;
      }
    }
  };


  /**
   * Create a FHIR coding object for a unit.
   *
   * @param lfUnit - Lforms unit, which includes name, code and system.
   * @returns FHIR coding object
   * @private
   */
  self._createFhirUnitCoding = function(lfUnit) {
    var ret = null;
    if(lfUnit) {
      ret = {};
      if(lfUnit.code) {
        ret.code = lfUnit.code;
      }
      if(lfUnit.name) {
        ret.display = lfUnit.name;
      }
      if(lfUnit.system) {
        ret.system = lfUnit.system;
      }
    }
    return ret;
  };


  /**
   * Set questionnaire-unitOption extensions using lforms units.
   *
   * @param targetFhirItem - FHIR Questionnaire item
   * @param units - lforms units array
   * @private
   */
  self._setUnitOptions = function(targetFhirItem, units) {
    for (var i=0, iLen=units.length; i<iLen; i++) {
      var unit = units[i];
      var fhirUnitExt = {
        "url": this.fhirExtUrlUnitOption,
        "valueCoding": self._createFhirUnitCoding(unit)
      };
      if(!targetFhirItem.extension) {
        targetFhirItem.extension = [];
      }
      targetFhirItem.extension.push(fhirUnitExt);
    }
  }

}

export default addCommonSDCExportFns;