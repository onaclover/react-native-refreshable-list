/**
 * @providesModule RefreshableList.Example
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from 'react-native-button';
import _ from 'lodash';

// Components
import RefreshableList from '@onaclover/react-native-refreshable-list';

export default class RefreshableListExample extends React.PureComponent {
  state = {
    hasMoreData: true,
    records: [],
  };

  loadMoreRecords = page => {
    const { records } = this.state;
    const nextRecords = _.range(20).map(num => `Row data #${num + 1 + (page - 1) * 20}`);
    const newState = { hasMoreData: page < 5, records: [...records, ...nextRecords] };
    setTimeout(() => this.setState(newState), 1000);
  };

  prependRecord = () => {
    const { records } = this.state;
    const newState = { records: [`New record ${Date.now()}`, ...records] };
    setTimeout(() => this.setState(newState), 1000);
  };

  refreshRecords = () => {
    const newState = {
      hasMoreData: true,
      records: _.range(20).map(num => `Row data #${num + 1}`),
    };
    setTimeout(() => this.setState(newState), 1000);
  };

  renderLoadMore = () => (
    <Text
      style={styles.recordControl}
      onPress={() => this.recordsList.loadMoreData()}
    >
      Load more...
    </Text>
  );
  renderFootLoading = () => <Text style={styles.recordControl}>Loading more data...</Text>;
  renderPlaceholder = () => <Text style={styles.recordControl}>Please wait...</Text>;
  renderRow = rowData => <Text style={styles.recordRow}>{rowData}</Text>;

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.flexWidth}>
          <View style={styles.headerButtons}>
            <Button onPress={() => this.recordsList.reloadData()} style={styles.headerButtonText}>
              Reload records
            </Button>
            <Button onPress={() => this.recordsList.loadMoreData()} style={styles.headerButtonText}>
              Load more records
            </Button>
            <Button onPress={this.prependRecord} style={styles.headerButtonText}>
              Prepend record
            </Button>
          </View>
        </View>
        <RefreshableList
          containerStyle={styles.recordsListContainer}
          dataBlob={this.state.records}
          hasMoreData={this.state.hasMoreData}
          inverted={false}
          manualLoadMore
          manualReload={false}
          onLoadMore={page => this.loadMoreRecords(page)}
          onRefresh={this.refreshRecords}
          ref={ref => this.recordsList = ref}
          refreshControlProps={{ tintColor: 'white' }}
          renderFootLoading={this.renderFootLoading}
          renderLoadMore={this.renderLoadMore}
          renderPlaceholder={this.renderPlaceholder}
          renderRow={this.renderRow}
          usesSGList={false}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#3b5998',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 20,
  },

  flexWidth: {
    flexDirection: 'row',
  },

  headerButtons: {
    borderColor: 'white',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    marginHorizontal: 10,
    textAlign: 'center',
  },
  
  recordsListContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 10,
  },
  recordControl: {
    color: 'white',
    fontSize: 13,
    fontStyle: 'italic',
    paddingBottom: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  recordRow: {
    color: 'white',
    fontSize: 17,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
});
