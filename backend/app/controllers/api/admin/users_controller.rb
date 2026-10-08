# Admin: view and edit the users table.
module Api
  module Admin
    class UsersController < BaseController
      before_action :set_user, only: [ :show, :update, :destroy ]

      def index
        users, meta = paginate(User.search(params[:q]).order(:id))
        render json: { users: users.map { UserSerializer.call(_1) }, meta: }
      end

      def show
        render json: { user: UserSerializer.call(@user) }
      end

      def create
        user = User.new(user_params)
        if user.save
          render json: { user: UserSerializer.call(user) }, status: :created
        else
          render_errors(user)
        end
      end

      def update
        attrs = user_params
        attrs = attrs.except(:password) if attrs[:password].blank?

        # An admin can't take admin rights away from themselves and lock everyone out.
        if @user == current_user && attrs.key?(:role) && attrs[:role] != "admin"
          return render json: { error: I18n.t("api.errors.cannot_demote_self") }, status: :unprocessable_content
        end

        if @user.update(attrs)
          bypass_sign_in(@user) if @user == current_user && attrs.key?(:password)
          render json: { user: UserSerializer.call(@user) }
        else
          render_errors(@user)
        end
      end

      def destroy
        if @user == current_user
          return render json: { error: I18n.t("api.errors.cannot_delete_self") }, status: :unprocessable_content
        end

        if @user.destroy
          head :no_content
        else
          render_errors(@user)
        end
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def user_params
        params.expect(user: [ :first_name, :last_name, :email, :role, :password ])
      end
    end
  end
end
