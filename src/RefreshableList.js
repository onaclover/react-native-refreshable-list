/**
 * @providesModule RefreshableList.Main
 */

import React from 'react';
import { ListView, RefreshControl, View } from 'react-native';
import InvertibleScrollView from 'react-native-invertible-scroll-view';
import SGListView from 'react-native-sglistview';
import _ from 'lodash';

import {
  PLACEHOLDER_DATA,
  MULTIPLE_SECTIONS_DATASOURCE,
  SINGLE_SECTION_DATASOURCE,
} from './constants';
import { hasSectionsDataBlob } from './utils';

/**
 * @README:
 * Function to check whether a transformed dataBlob is empty or not
 * First map all empty check of its values (`_.map` works for both Arrays & Plain objects)
 * Then reduce results (array of booleans) using `&&` operator.
 * This function can be written verbosely in pseudo-code as:
 *  return isEmpty(valuesOf(dataBlob)[0]) && isEmpty(valuesOf(dataBlob)[1]) && ...
 */
export function isEmptyDataBlob(dataBlob) {
  return _.reduce(_.map(dataBlob, _.isEmpty), (final, element) => (final && element));
}

export default class RefreshableList extends React.PureComponent {
  static propTypes = {
    containerStyle: View.propTypes.style,
    dataBlob: React.PropTypes.any.isRequired,
    inverted: React.PropTypes.bool,
    manualLoadMore: React.PropTypes.bool,
    manualReload: React.PropTypes.bool,
    onLoadMore: React.PropTypes.func,
    onRefresh: React.PropTypes.func,
    renderFootLoading: React.PropTypes.func,
    renderLoadMore: React.PropTypes.func,
    renderPlaceholder: React.PropTypes.func,
    renderRow: React.PropTypes.func.isRequired,
    usesSGList: React.PropTypes.bool,
  };

  static defaultProps = {
    // Passed props
    containerStyle: null,
    inverted: false,
    manualLoadMore: false,
    manualReload: false,
    onLoadMore: null,
    onRefresh: null,
    renderFootLoading: null,
    renderLoadMore: null,
    renderPlaceholder: null,
    usesSGList: false,

    // Default props, will be passed to SGListView
    enableEmptySections: true,
    initialListSize: 20,
    onEndReachedThreshold: 1,
    pageSize: 1,
    removeClippedSubviews: false,
    scrollRenderAheadDistance: 1,
    stickyHeaderIndices: [],
  };

  constructor(props) {
    super(props);

    this.hasSections = false;
    this.mounted = false;

    const {
      onLoadMore,
      onRefresh,
      renderFootLoading,
      renderLoadMore,
      renderPlaceholder,
      renderRow,
    } = this.props;
    
    // Required props
    this.onRefresh = onRefresh.bind(this);
    this.renderRow = renderRow.bind(this);

    // Optional props
    this.onLoadMore = onLoadMore == null ? () => {} : onLoadMore.bind(this);
    this.renderFootLoading = renderFootLoading == null ? () => null : renderFootLoading.bind(this);
    this.renderLoadMore = renderLoadMore == null ? () => null : renderLoadMore.bind(this);
    this.renderPlaceholder = renderPlaceholder == null ? () => null : renderPlaceholder.bind(this);
    
    // Copy defaultStates
    this.state = { ...this.defaultStates };
  }

  componentDidMount() {
    this.mounted = true;
    !this.props.manualReload && this.reloadData();
  }

  componentWillReceiveProps(nextProps) {
    this.hasSections = hasSectionsDataBlob(nextProps.dataBlob);
  }

  componentDidUpdate(prevProps) {
    const { dataBlob } = this.props;
    const { dataBlob: prevDataBlob } = prevProps;

    if (dataBlob !== prevDataBlob)
      this.populateData();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  get clonedDataSource() {
    const { dataBlob } = this.props;

    return this.hasSections
      ? MULTIPLE_SECTIONS_DATASOURCE.cloneWithRowsAndSections(dataBlob)
      : SINGLE_SECTION_DATASOURCE.cloneWithRows(dataBlob);
  }

  get placeholderDataSource() {
    if (!this.hasSections)
      return SINGLE_SECTION_DATASOURCE.cloneWithRows([{ placeholder: true }]);

    return MULTIPLE_SECTIONS_DATASOURCE.cloneWithRowsAndSections({
      [PLACEHOLDER_DATA]: { [PLACEHOLDER_DATA]: { placeholder: true } },
    });
  }

  get defaultStates() {
    return {
      currentPage: 1,
      dataSource: this.clonedDataSource,
      isLoadingMore: false,             // Current fetch is to load next page of data
      isRefreshing: false,              // Current fetch is to refresh all data
      isReloading: false,               // Reset all states
    };
  }

  get refreshControl() {
    if (this.props.onRefresh == null) return null;

    return (
      <RefreshControl
        refreshing={this.state.isRefreshing}
        onRefresh={this.refreshData}
        {...this.props.refreshControlProps}
      />
    );
  }

  // Public methods
  cancelLoading = () => this.updateStates({
    isLoadingMore: false,
    isRefreshing: false,
    isReloading: false,
  });

  loadMoreData = () => {
    const { currentPage, isLoadingMore, isRefreshing, isReloading } = this.state;
    if (isLoadingMore || isRefreshing || isReloading) return;

    const page = currentPage + 1;
    const newState = { currentPage: page, isLoadingMore: true };
    this.updateStates(newState, () => this.onLoadMore({ page, reloading: false }));
  };

  refreshData = () => {
    const newState = { currentPage: 1, isRefreshing: true };
    this.updateStates(newState, () => this.onRefresh({ page: 1, reloading: false }));
  };

  reloadData = () => {
    const { isRefreshing, isReloading } = this.state;
    if (isRefreshing || isReloading) return;

    const newState = { ...this.defaultStates, isReloading: true };
    this.updateStates(newState, () => this.onRefresh({ page: 1, reloading: true }));
  };

  // Private methods
  resetScrollOffset = isRefreshing => {
    const nativeListView = this.props.usesSGList
      ? this.listView.getNativeListView()
      : this.listView;

    isRefreshing && nativeListView.scrollTo({ animated: false, y: 0 });
  };

  populateData = () => {
    const { isRefreshing } = this.state;

    const newState = {
      dataSource: this.clonedDataSource,
      isLoadingMore: false,
      isRefreshing: false,
      isReloading: false,
    };

    this.updateStates(newState, () => this.resetScrollOffset(isRefreshing));
  };

  // State helpers
  updateStates = (newState, callback) => {
    if (!this.mounted) return;
    this.setState(newState, callback);
  }

  onEndReached = () => {
    const { manualLoadMore, onLoadMore } = this.props;
    !manualLoadMore && onLoadMore != null && this.loadMoreData();
  };

  renderFooter = () => {
    const { renderFooter } = this.props;
    const { isLoadingMore, isRefreshing, isReloading } = this.state;

    const shouldRenderLoadMore = !isLoadingMore && !isRefreshing && !isReloading;
    const footLoadingRenderer = isLoadingMore ? this.renderFootLoading : () => null;
    const loadMoreRenderer = shouldRenderLoadMore ? this.renderLoadMore : footLoadingRenderer;
    return loadMoreRenderer != null ? loadMoreRenderer() : renderFooter.bind(this)();
  };

  renderScrollComponent = props => <InvertibleScrollView {...props} />;

  render() {
    const { containerStyle, usesSGList } = this.props;
    const { isReloading } = this.state;

    const dataSource = isReloading ? this.placeholderDataSource : this.state.dataSource;
    const renderRow = isReloading ? this.renderPlaceholder : this.renderRow;

    const ListViewComponent = usesSGList ? SGListView : ListView;

    const listContent = (
      <ListViewComponent
        {...this.props}
        dataSource={dataSource}
        onEndReached={this.onEndReached}
        ref={ref => this.listView = ref}
        refreshControl={this.refreshControl}
        renderFooter={this.renderFooter}
        renderRow={renderRow}
        renderScrollComponent={this.renderScrollComponent}
      />
    );

    if (containerStyle == null)
      return listContent;

    return (
      <View style={containerStyle}>
        {listContent}
      </View>
    );
  }
}
