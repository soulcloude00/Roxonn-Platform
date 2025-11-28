import { Card } from './ui/card';
import { RefreshCw, ArrowDown, ArrowUp, ArrowDownUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useOnrampTransactions, OnrampTransaction } from '../hooks/use-onramp-transactions';
import { formatDistanceToNow } from 'date-fns';

export function TransactionHistory() {
  const { data: transactions, isLoading, error, refetch } = useOnrampTransactions(10);
  
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            title="Refresh transactions"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {error ? (
          <div className="py-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Failed to load transactions</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={() => refetch()}
            >
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="py-6 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-500">Loading transactions...</p>
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map(transaction => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowDown className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Your transaction history will appear here once you've made your first purchase or transfer.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function TransactionItem({ transaction }: { transaction: OnrampTransaction }) {
  // Check if this is an off-ramp (sell) transaction based on metadata
  const isOffRamp = transaction.metadata?.transactionType === 'offramp';
  
  const getTransactionTypeIcon = () => {
    return isOffRamp ? 
      <ArrowUp className="h-5 w-5 text-purple-500 flex-shrink-0" /> : 
      <ArrowDown className="h-5 w-5 text-blue-500 flex-shrink-0" />;
  };
  
  const getTransactionTypeLabel = () => {
    return isOffRamp ? 'Sell' : 'Buy';
  };
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />;
    }
  };
  
  const getStatusText = (status: string) => {
    switch(status) {
      case 'initiated':
        return 'Initiated';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const getStatusClass = (status: string) => {
    switch(status) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'processing':
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };
  
  // Get relative time (e.g. '2 hours ago')
  const timeAgo = formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true });
  
  return (
    <div className="border rounded-md p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {getTransactionTypeIcon()}
          <div>
            <div className="font-medium text-sm">
              <span className="mr-1">{getTransactionTypeLabel()}:</span>
              {transaction.amount ? `${transaction.amount} XDC` : 'XDC Transaction'}
              {transaction.orderId && <span className="text-xs text-gray-500 ml-1">#{transaction.orderId}</span>}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {timeAgo} • <span className={`flex items-center gap-1 ${transaction.status === 'success' ? 'text-green-500' : transaction.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                {getStatusIcon(transaction.status)}
                {getStatusText(transaction.status)}
              </span>
            </div>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs ${isOffRamp ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
        >
          {isOffRamp ? 'Withdraw' : 'Purchase'}
        </Badge>
      </div>
    </div>
  );
}
