import { Model } from '@nozbe/watermelondb'
import { date, text } from '@nozbe/watermelondb/decorators'

export default class SyncMetadata extends Model {
  static table = 'sync_metadata'

  @text('key') key!: string
  @text('value') value!: string
  @date('updated_at') updatedAt!: number

  // Métodos auxiliares
  get isLastPulledAt() {
    return this.key === 'lastPulledAt'
  }

  get isLastSync() {
    return this.key === 'lastSync'
  }

  get numericValue() {
    return parseInt(this.value, 10)
  }
}
