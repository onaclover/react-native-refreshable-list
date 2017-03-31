/**
 * @providesModule RefreshableList.Constants
 */

import { ListView } from 'react-native';

const DEFAULT_SECTION_ID = '___DEFAULT-SECTION-ID___';
const EMPTY_DATA = '___EMPTY-DATA___';
const PLACEHOLDER_DATA = '___PLACEHOLDER-DATA___';

const SINGLE_SECTION_DATASOURCE = new ListView.DataSource({
  rowHasChanged: ((r1, r2) => r1 !== r2),
});

const MULTIPLE_SECTIONS_DATASOURCE = new ListView.DataSource({
  getRowData: ((dataBlob, sectionID, rowID) => dataBlob[sectionID][parseInt(rowID)]),
  getSectionHeaderData: (sectionID => sectionID),
  rowHasChanged: ((r1, r2) => r1 !== r2),
  sectionHeaderHasChanged: ((s1, s2) => s1 !== s2),
});

export {
  DEFAULT_SECTION_ID,
  EMPTY_DATA,
  PLACEHOLDER_DATA,
  SINGLE_SECTION_DATASOURCE,
  MULTIPLE_SECTIONS_DATASOURCE,
};
