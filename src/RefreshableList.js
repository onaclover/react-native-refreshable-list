/**
 * @providesModule RefreshableList.Index
 */

import React from 'react';
import { ListView, RefreshControl, View } from 'react-native';
import InvertibleScrollView from 'react-native-invertible-scroll-view';
import SGListView from 'react-native-sglistview';
import { Logger } from '@onaclover/react-native-utils';

import {
  EMPTY_DATA,
  PLACEHOLDER_DATA,
  MULTIPLE_SECTIONS_DATASOURCE,
  SINGLE_SECTION_DATASOURCE,
} from './constants';
import { isEmptyDataBlob, hasSectionsDataBlob } from './utils';

export default class RefreshableList extends React.PureComponent {
  static propTypes = {
    containerStyle: View.propTypes.style,
    dataBlob: React.PropTypes.any.isRequired,
    hasMoreData: React.PropTypes.bool,
    inverted: React.PropTypes.bool,
    loadMoreEnabled: React.PropTypes.bool,
    manualReload: React.PropTypes.bool,
    onFetchData: React.PropTypes.func,
    refreshEnabled: React.PropTypes.bool,
    renderEmptyData: React.PropTypes.func,
    renderFootLoading: React.PropTypes.func,
    renderLoadMore: React.PropTypes.func,
    renderPlaceholder: React.PropTypes.func,
    renderRow: React.PropTypes.func.isRequired,
    usesSGList: React.PropTypes.bool,
  };

  static defaultProps = {
    // Passed props
    containerStyle: null,
    hasMoreData: true,
    inverted: false,
    loadMoreEnabled: true,
    manualReload: false,
    refreshEnabled: true,
    renderEmptyData: null,
    renderFootLoading: null,
    renderLoadMore: null,
    renderPlaceholder: null,
    usesSGList: false,

    // Default props, will be passed to SGListView
    enableEmptySections: true,
    initialListSize: 20,
    onEndReachedThreshold: 1,
    pageSize: 20,
    removeClippedSubviews: false,
    scrollRenderAheadDistance: 1,
    stickyHeaderIndices: [],
  };

  constructor(props) {
    super(props);

    this.hasSections = false;
    this.mounted = false;

    // Optional props
    const {
      onFetchData,
      renderEmptyData,
      renderFootLoading,
      renderLoadMore,
      renderPlaceholder,
    } = this.props;

    this.onFetchData = onFetchData == null ? () => {} : onFetchData.bind(this);
    this.renderEmptyData = renderEmptyData == null ? () => null : renderEmptyData.bind(this);
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

  get emptyDataSource() {
    if (!this.hasSections)
      return SINGLE_SECTION_DATASOURCE.cloneWithRows([{ empty: true }]);

    return MULTIPLE_SECTIONS_DATASOURCE.cloneWithRowsAndSections({
      [EMPTY_DATA]: { [EMPTY_DATA]: { empty: true } },
    });
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
      isEmpty: false,
      isLoadingMore: false,
      isRefreshing: false,
      isReloading: false,
    };
  }

  get refreshControl() {
    if (!this.props.refreshEnabled) return null;

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
    isEmpty: false,
    isLoadingMore: false,
    isRefreshing: false,
    isReloading: false,
  });

  loadMoreData = () => {
    if (!this.props.hasMoreData) return;

    const { currentPage, isLoadingMore, isRefreshing, isReloading } = this.state;
    if (isLoadingMore || isRefreshing || isReloading) return;

    const page = currentPage + 1;
    const newState = { currentPage: page, isLoadingMore: true };
    this.updateStates(newState, () => this.onFetchData({ page, reloading: false }));
  };

  refreshData = () => {
    const newState = { currentPage: 1, isRefreshing: true };
    this.updateStates(newState, () => this.onFetchData({ page: 1, reloading: false }));
  };

  reloadData = () => {
    const { isRefreshing, isReloading } = this.state;
    if (isRefreshing || isReloading) return;

    const newState = { ...this.defaultStates, isReloading: true };
    this.updateStates(newState, () => this.onFetchData({ page: 1, reloading: true }));
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
      isEmpty: isEmptyDataBlob(this.clonedDataSource._dataBlob),
      isLoadingMore: false,
      isRefreshing: false,
      isReloading: false,
    };

    this.updateStates(newState, () => this.resetScrollOffset(isRefreshing));
  };

  // State helpers
  updateStates = (newState, callback) => {
    if (!this.mounted) return;
    this.setState(newState, () => {
      callback && callback();
      Logger.debug(this.state);
    });
  }

  // Listview props
  buildDataSource = () => {
    const { isEmpty, isReloading } = this.state;

    const emptyDataSource = isEmpty ? this.emptyDataSource : this.state.dataSource;
    return isReloading ? this.placeholderDataSource : emptyDataSource;
  };

  onEndReached = () => {
    const { loadMoreEnabled, renderLoadMore } = this.props;
    renderLoadMore == null && loadMoreEnabled && this.loadMoreData();
  };

  renderFooter = () => {
    const { renderFooter, renderLoadMore } = this.props;
    const { isLoadingMore, isRefreshing, isReloading } = this.state;

    const defaultRenderer = renderFooter == null ? () => null : renderFooter.bind(this);

    if (isRefreshing || isReloading) return defaultRenderer();
    if (renderLoadMore != null) return this.renderLoadMore();
    if (isLoadingMore) return this.renderFootLoading();

    return defaultRenderer();
  };

  renderScrollComponent = props => <InvertibleScrollView {...props} />;

  renderRow = (...args) => {
    const { renderRow } = this.props;
    const { isEmpty, isReloading } = this.state;

    const emptyDataRenderer = isEmpty ? this.renderEmptyData : renderRow.bind(this);
    const rowRenderer = isReloading ? this.renderPlaceholder : emptyDataRenderer;

    return rowRenderer(...args);
  }

  render() {
    const { containerStyle, usesSGList } = this.props;
    const ListViewComponent = usesSGList ? SGListView : ListView;

    const listContent = (
      <ListViewComponent
        {...this.props}
        dataSource={this.buildDataSource()}
        onEndReached={this.onEndReached}
        ref={ref => this.listView = ref}
        refreshControl={this.refreshControl}
        renderFooter={this.renderFooter}
        renderRow={this.renderRow}
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
